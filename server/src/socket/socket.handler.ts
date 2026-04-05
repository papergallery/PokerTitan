import { Server, Socket } from 'socket.io';
import { FastifyInstance } from 'fastify';
import * as matchmaking from '../matchmaking/matchmaking.service';
import * as gameEngine from '../game/game.engine';
import { calculateMMRChanges } from '../game/mmr';
import { db } from '../db/client';

interface JwtPayload {
  id: number;
  email: string;
}

// In-memory game states: tournamentId → GameState
const gameStates = new Map<number, gameEngine.GameState>();
// Turn timers: tournamentId → NodeJS.Timeout
const turnTimers = new Map<number, ReturnType<typeof setTimeout>>();

function getPersonalizedState(
  state: gameEngine.GameState,
  userId: number
): object {
  return {
    ...state,
    deck: undefined, // never send deck to clients
    players: state.players.map((p) => ({
      ...p,
      cards:
        p.userId === userId || state.stage === 'showdown'
          ? p.cards
          : p.cards.map(() => null),
    })),
  };
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
  }, 30_000);
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
    const newState = gameEngine.advanceStage(state);
    gameStates.set(tournamentId, newState);
    broadcastGameState(io, newState);

    if (newState.stage === 'showdown') {
      await finishHand(io, tournamentId, newState);
    } else {
      const currentPlayer = newState.players[newState.currentPlayerIndex];
      io.emit('game:turn', { userId: currentPlayer.userId, timeLeft: 30 });
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

  const stillAlive = newState.players.filter((p) => p.status !== 'eliminated');

  if (stillAlive.length <= 1) {
    // Tournament over
    const sorted = [...newState.players].sort((a, b) => b.chips - a.chips);
    const format = newState.players.length === 2 ? '1v1' : '5-player';
    const places = sorted.map((p, i) => ({ userId: p.userId, place: i + 1 }));
    const mmrChanges = calculateMMRChanges(places, format);

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
      mmrChange: mmrChanges.find((m) => m.userId === p.userId)?.mmrChange ?? 0,
    }));

    io.to(`tournament:${tournamentId}`).emit('game:end', { places: endPayload });
    gameStates.delete(tournamentId);
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
      timeLeft: 30,
    });
    startTurnTimer(io, tournamentId, currentPlayer.userId);
  }
}

async function createTournament(
  format: '1v1' | '5-player',
  players: matchmaking.QueueEntry[]
): Promise<number> {
  const result = await db.query<{ id: number }>(
    `INSERT INTO tournaments (status, format, started_at) VALUES ('in_progress', $1, NOW()) RETURNING id`,
    [format]
  );
  const tournamentId = result.rows[0].id;
  for (const p of players) {
    await db.query(
      'INSERT INTO tournament_players (tournament_id, user_id) VALUES ($1, $2)',
      [tournamentId, p.userId]
    );
  }
  return tournamentId;
}

export function initSocketHandler(io: Server, app: FastifyInstance): void {
  // Run matchmaking interval
  const formats: Array<'1v1' | '5-player'> = ['1v1', '5-player'];
  setInterval(async () => {
    for (const format of formats) {
      const matched = matchmaking.tryMatch(format);
      if (!matched) continue;

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
        }
      }

      broadcastGameState(io, state);
      const currentPlayer = state.players[state.currentPlayerIndex];
      io.to(`tournament:${tournamentId}`).emit('game:turn', {
        userId: currentPlayer.userId,
        timeLeft: 30,
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

    socket.on('join-queue', (data: { format: '1v1' | '5-player'; mmr: number }) => {
      matchmaking.joinQueue(
        { userId, mmr: data.mmr, joinedAt: new Date(), socketId: socket.id },
        data.format
      );
    });

    socket.on('leave-queue', (data: { format: '1v1' | '5-player' }) => {
      matchmaking.leaveQueue(userId, data.format);
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
            timeLeft: 30,
          });
          startTurnTimer(io, tournamentId, currentPlayer.userId);
        }
      }
    );

    socket.on('disconnect', () => {
      matchmaking.leaveAllQueues(userId);
    });
  });
}
