import { Server, Socket } from 'socket.io';
import { FastifyInstance } from 'fastify';
import * as matchmaking from '../matchmaking/matchmaking.service';
import { GameFormat } from '../matchmaking/matchmaking.service';
import * as gameEngine from '../game/game.engine';
import { calculateMMRChanges } from '../game/mmr';
import { db } from '../db/client';

interface JwtPayload {
  id: number;
  email: string;
}

// In-memory game states: tournamentId → GameState
const gameStates = new Map<number, gameEngine.GameState>();
// Player names: tournamentId → (userId → { name, avatarUrl })
const playerNames = new Map<number, Map<number, { name: string; avatarUrl?: string }>>();
// Turn timers: tournamentId → NodeJS.Timeout
const turnTimers = new Map<number, ReturnType<typeof setTimeout>>();
// Tournament formats: tournamentId → GameFormat
const tournamentFormats = new Map<number, GameFormat>();

function getTurnDuration(tournamentId: number): number {
  const format = tournamentFormats.get(tournamentId);
  return (format === '1v1-turbo') ? 10 : 30;
}

function getPersonalizedState(
  state: gameEngine.GameState,
  userId: number
): object {
  return {
    ...state,
    deck: undefined, // never send deck to clients
    currentPlayerId: state.players[state.currentPlayerIndex]?.userId,
    myUserId: userId,
    players: state.players.map((p) => {
      const info = playerNames.get(state.tournamentId)?.get(p.userId);
      return {
        ...p,
        name: info?.name ?? String(p.userId),
        avatarUrl: info?.avatarUrl,
        cards:
          p.userId === userId || state.stage === 'showdown'
            ? p.cards
            : p.cards.map(() => null),
      };
    }),
  };
}

function broadcastQueueCount(io: Server, format: GameFormat): void {
  const entries = matchmaking.getQueueEntries(format);
  const count = entries.length;
  for (const entry of entries) {
    const socket = io.sockets.sockets.get(entry.socketId);
    if (socket) socket.emit('queue:count', { format, count });
  }
}

function broadcastGameState(io: Server, state: gameEngine.GameState): void {
  for (const player of state.players) {
    const sockets = io.sockets.sockets;
    sockets.forEach((socket) => {
      const uid = (socket.data as { userId?: number }).userId;
      if (uid === player.userId) {
        socket.emit('game:state', getPersonalizedState(state, player.userId));
      }
    });
  }
}

function startTurnTimer(
  io: Server,
  tournamentId: number,
  userId: number
): void {
  clearTurnTimer(tournamentId);
  const timer = setTimeout(async () => {
    const state = gameStates.get(tournamentId);
    if (!state) return;
    const newState = gameEngine.processAction(state, userId, 'fold');
    gameStates.set(tournamentId, newState);
    broadcastGameState(io, newState);
    await advanceIfNeeded(io, tournamentId, newState);
  }, getTurnDuration(tournamentId) * 1000);
  turnTimers.set(tournamentId, timer);
}

function clearTurnTimer(tournamentId: number): void {
  const t = turnTimers.get(tournamentId);
  if (t) {
    clearTimeout(t);
    turnTimers.delete(tournamentId);
  }
}

async function advanceIfNeeded(
  io: Server,
  tournamentId: number,
  state: gameEngine.GameState
): Promise<void> {
  if (gameEngine.isHandOver(state)) {
    await finishHand(io, tournamentId, state);
    return;
  }
  if (gameEngine.isBettingRoundOver(state)) {
    let newState = gameEngine.advanceStage(state);
    gameStates.set(tournamentId, newState);
    broadcastGameState(io, newState);

    // If all remaining players are all-in, auto-advance stages until showdown
    while (
      newState.stage !== 'showdown' &&
      newState.players.filter((p) => p.status === 'active').length === 0
    ) {
      newState = gameEngine.advanceStage(newState);
      gameStates.set(tournamentId, newState);
      broadcastGameState(io, newState);
    }

    if (newState.stage === 'showdown') {
      await finishHand(io, tournamentId, newState);
    } else {
      const currentPlayer = newState.players[newState.currentPlayerIndex];
      io.to(`tournament:${tournamentId}`).emit('game:turn', {
        userId: currentPlayer.userId,
        timeLeft: getTurnDuration(tournamentId),
      });
      startTurnTimer(io, tournamentId, currentPlayer.userId);
    }
  }
}

async function finishHand(
  io: Server,
  tournamentId: number,
  state: gameEngine.GameState
): Promise<void> {
  clearTurnTimer(tournamentId);
  const { winnerId, handName } = gameEngine.determineWinner(state);

  // Award pot to winner
  const newState = structuredClone(state) as gameEngine.GameState;
  const winner = newState.players.find((p) => p.userId === winnerId);
  if (winner) winner.chips += newState.pot;
  newState.pot = 0;

  io.to(`tournament:${tournamentId}`).emit('game:result', {
    winnerId,
    pot: state.pot,
    handName,
  });

  // Eliminate players with 0 chips
  newState.players.forEach((p) => {
    if (p.chips === 0) p.status = 'eliminated';
  });

  // Bounty: award MMR for eliminations in bounty format
  const format = tournamentFormats.get(tournamentId);
  if (format === '5-player-bounty') {
    const newlyEliminated = newState.players.filter(p => p.chips === 0);
    if (newlyEliminated.length > 0 && winnerId) {
      const bountyBonus = newlyEliminated.length * 10;
      await db.query('UPDATE users SET mmr = GREATEST(0, mmr + $1) WHERE id = $2', [bountyBonus, winnerId]);
      io.to(`tournament:${tournamentId}`).emit('bounty:kill', {
        killerId: winnerId,
        eliminated: newlyEliminated.map(p => p.userId),
        bonus: bountyBonus,
      });
    }
  }

  const stillAlive = newState.players.filter((p) => p.status !== 'eliminated');

  if (stillAlive.length <= 1) {
    // Tournament over
    const sorted = [...newState.players].sort((a, b) => b.chips - a.chips);
    const resolvedFormat = tournamentFormats.get(tournamentId) ?? (newState.players.length === 2 ? '1v1' : '5-player');
    const places = sorted.map((p, i) => ({ userId: p.userId, place: i + 1 }));
    const mmrChanges = calculateMMRChanges(places, resolvedFormat);

    // Save to DB
    await db.query(
      'UPDATE tournaments SET status = $1, finished_at = NOW() WHERE id = $2',
      ['finished', tournamentId]
    );
    for (const { userId, place } of places) {
      const mmrChange = mmrChanges.find((m) => m.userId === userId)?.mmrChange ?? 0;
      await db.query(
        'UPDATE tournament_players SET place = $1, mmr_change = $2 WHERE tournament_id = $3 AND user_id = $4',
        [place, mmrChange, tournamentId, userId]
      );
      await db.query(
        'UPDATE users SET mmr = GREATEST(0, mmr + $1) WHERE id = $2',
        [mmrChange, userId]
      );
    }

    const endPayload = places.map((p) => ({
      ...p,
      name: playerNames.get(tournamentId)?.get(p.userId)?.name ?? String(p.userId),
      mmrChange: mmrChanges.find((m) => m.userId === p.userId)?.mmrChange ?? 0,
    }));

    io.to(`tournament:${tournamentId}`).emit('game:end', { places: endPayload });
    gameStates.delete(tournamentId);
    playerNames.delete(tournamentId);
    tournamentFormats.delete(tournamentId);
  } else {
    // Start next hand
    const nextState = gameEngine.createGameState(
      tournamentId,
      stillAlive.map((p) => ({ userId: p.userId }))
    );
    // Carry over chips
    nextState.players.forEach((p) => {
      const prev = newState.players.find((pp) => pp.userId === p.userId);
      if (prev) p.chips = prev.chips;
    });
    gameStates.set(tournamentId, nextState);
    broadcastGameState(io, nextState);
    const currentPlayer = nextState.players[nextState.currentPlayerIndex];
    io.to(`tournament:${tournamentId}`).emit('game:turn', {
      userId: currentPlayer.userId,
      timeLeft: getTurnDuration(tournamentId),
    });
    startTurnTimer(io, tournamentId, currentPlayer.userId);
  }
}

async function createTournament(
  format: GameFormat,
  players: matchmaking.QueueEntry[]
): Promise<number> {
  const result = await db.query<{ id: number }>(
    `INSERT INTO tournaments (status, format, started_at) VALUES ('in_progress', $1, NOW()) RETURNING id`,
    [format]
  );
  const tournamentId = result.rows[0].id;
  tournamentFormats.set(tournamentId, format);
  for (const p of players) {
    await db.query(
      'INSERT INTO tournament_players (tournament_id, user_id) VALUES ($1, $2)',
      [tournamentId, p.userId]
    );
  }

  // Fetch and store player names/avatars
  const usersResult = await db.query<{ id: number; name: string; avatar_url?: string }>(
    'SELECT id, name, avatar_url FROM users WHERE id = ANY($1)',
    [players.map((p) => p.userId)]
  );
  const names = new Map<number, { name: string; avatarUrl?: string }>();
  for (const row of usersResult.rows) {
    names.set(row.id, { name: row.name, avatarUrl: row.avatar_url ?? undefined });
  }
  playerNames.set(tournamentId, names);

  return tournamentId;
}

export function initSocketHandler(io: Server, app: FastifyInstance): void {
  // Run matchmaking interval
  const formats: GameFormat[] = ['1v1', '5-player', '1v1-turbo', '5-player-bounty'];
  setInterval(async () => {
    for (const format of formats) {
      const matched = matchmaking.tryMatch(format);
      if (!matched) {
        if (format === '5-player' || format === '5-player-bounty') broadcastQueueCount(io, format);
        continue;
      }

      const tournamentId = await createTournament(format, matched);
      const state = gameEngine.createGameState(
        tournamentId,
        matched.map((p) => ({ userId: p.userId }))
      );
      gameStates.set(tournamentId, state);

      // Notify players and add them to tournament room
      for (const entry of matched) {
        const socket = io.sockets.sockets.get(entry.socketId);
        if (socket) {
          socket.join(`tournament:${tournamentId}`);
          socket.emit('matchmaking:found', {
            tournamentId,
            format,
            players: matched.map((p) => ({ userId: p.userId, mmr: p.mmr })),
          });
          console.log(`[MM] Notified user=${entry.userId} socket=${entry.socketId} → tournament=${tournamentId}`);
        } else {
          console.log(`[MM] WARNING: user=${entry.userId} has no active socket (socketId="${entry.socketId}") — cannot notify`);
        }
      }

      broadcastGameState(io, state);
      const currentPlayer = state.players[state.currentPlayerIndex];
      io.to(`tournament:${tournamentId}`).emit('game:turn', {
        userId: currentPlayer.userId,
        timeLeft: getTurnDuration(tournamentId),
      });
      startTurnTimer(io, tournamentId, currentPlayer.userId);
    }
  }, 2000);

  io.on('connection', async (socket: Socket) => {
    // Authenticate via JWT cookie
    const cookieHeader = socket.handshake.headers.cookie ?? '';
    const tokenMatch = cookieHeader.match(/token=([^;]+)/);
    if (!tokenMatch) {
      socket.disconnect();
      return;
    }
    try {
      const payload = app.jwt.verify<JwtPayload>(tokenMatch[1]);
      socket.data = { userId: payload.id };
    } catch {
      socket.disconnect();
      return;
    }

    const userId = (socket.data as { userId: number }).userId;
    console.log(`[Socket] Connected: user=${userId} socket=${socket.id}`);

    socket.on('join-queue', (data: { format: GameFormat; mmr: number }) => {
      matchmaking.joinQueue(
        { userId, mmr: data.mmr, joinedAt: new Date(), socketId: socket.id },
        data.format
      );
      if (data.format === '5-player' || data.format === '5-player-bounty') broadcastQueueCount(io, data.format);
    });

    socket.on('leave-queue', (data: { format: GameFormat }) => {
      matchmaking.leaveQueue(userId, data.format);
    });

    socket.on('game:ready', (data: { tournamentId: number }) => {
      const state = gameStates.get(data.tournamentId);
      if (!state) return;
      const isPlayer = state.players.some((p) => p.userId === userId);
      if (!isPlayer) return;
      socket.join(`tournament:${data.tournamentId}`);
      socket.emit('game:state', getPersonalizedState(state, userId));
    });

    socket.on(
      'game:action',
      async (data: { action: 'fold' | 'check' | 'call' | 'raise'; amount?: number }) => {
        // Find tournament for this user
        let tournamentId: number | undefined;
        for (const [tid, state] of gameStates.entries()) {
          if (state.players.find((p) => p.userId === userId)) {
            tournamentId = tid;
            break;
          }
        }
        if (!tournamentId) return;

        const state = gameStates.get(tournamentId);
        if (!state) return;

        clearTurnTimer(tournamentId);
        const newState = gameEngine.processAction(state, userId, data.action, data.amount);
        gameStates.set(tournamentId, newState);
        broadcastGameState(io, newState);
        await advanceIfNeeded(io, tournamentId, newState);

        if (!gameEngine.isHandOver(newState) && !gameEngine.isBettingRoundOver(newState)) {
          const currentPlayer = newState.players[newState.currentPlayerIndex];
          io.to(`tournament:${tournamentId}`).emit('game:turn', {
            userId: currentPlayer.userId,
            timeLeft: getTurnDuration(tournamentId),
          });
          startTurnTimer(io, tournamentId, currentPlayer.userId);
        }
      }
    );

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: user=${userId} socket=${socket.id} reason=${reason}`);
      matchmaking.leaveAllQueues(userId);
    });
  });
}
