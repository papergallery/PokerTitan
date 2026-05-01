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
// Player names: tournamentId → (userId → { name, avatarUrl, isPremium })
const playerNames = new Map<number, Map<number, { name: string; avatarUrl?: string; isPremium?: boolean }>>();
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
  const dlrIdx = gameEngine.dealerIndex(state);
  const n = state.players.length;
  const isHeadsUp = n === 2;
  const sbIndex = isHeadsUp ? dlrIdx : (dlrIdx + 1) % n;
  const bbIndex = isHeadsUp ? (dlrIdx + 1) % n : (dlrIdx + 2) % n;

  return {
    ...state,
    deck: undefined,
    currentPlayerId: state.players[state.currentPlayerIndex]?.userId,
    myUserId: userId,
    dealerUserId: state.dealerUserId,
    sbUserId: state.players[sbIndex]?.userId,
    bbUserId: state.players[bbIndex]?.userId,
    lastRaiseIncrement: state.lastRaiseIncrement,
    players: state.players.map((p) => {
      const info = playerNames.get(state.tournamentId)?.get(p.userId);
      return {
        ...p,
        name: info?.name ?? String(p.userId),
        avatarUrl: info?.avatarUrl,
        isPremium: info?.isPremium ?? false,
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
  // Send game state only to sockets in the tournament room
  const room = `tournament:${state.tournamentId}`;
  const roomSockets = io.sockets.adapter.rooms.get(room);
  if (!roomSockets) return;

  for (const socketId of roomSockets) {
    const socket = io.sockets.sockets.get(socketId);
    if (!socket) continue;
    const uid = (socket.data as { userId?: number }).userId;
    if (uid === undefined) continue;
    const isPlayer = state.players.some(p => p.userId === uid);
    if (isPlayer) {
      socket.emit('game:state', getPersonalizedState(state, uid));
    }
  }
}

/**
 * Sort player ids clockwise from the small blind.
 *
 * Used for the "odd chip" rule: when a pot is split unevenly, the leftover
 * chip goes to the winner closest to the small blind.
 */
function sortIdsByPositionFromSB(ids: number[], state: gameEngine.GameState): number[] {
  const dlrIdx = gameEngine.dealerIndex(state);
  const n = state.players.length;
  const sbIdx = n === 2 ? dlrIdx : (dlrIdx + 1) % n;
  return [...ids].sort((a, b) => {
    const aIdx = state.players.findIndex(p => p.userId === a);
    const bIdx = state.players.findIndex(p => p.userId === b);
    const aDist = (aIdx - sbIdx + n) % n;
    const bDist = (bIdx - sbIdx + n) % n;
    return aDist - bDist;
  });
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
    // Auto-check if possible, otherwise auto-fold
    const action = gameEngine.canCheck(state, userId) ? 'check' : 'fold';
    const newState = gameEngine.processAction(state, userId, action);
    gameStates.set(tournamentId, newState);
    broadcastGameState(io, newState);
    await advanceIfNeeded(io, tournamentId, newState);

    // If hand/round didn't end, start timer for next player
    if (!gameEngine.isHandOver(newState) && !gameEngine.isBettingRoundOver(newState)) {
      const currentPlayer = newState.players[newState.currentPlayerIndex];
      if (currentPlayer && currentPlayer.status === 'active') {
        io.to(`tournament:${tournamentId}`).emit('game:turn', {
          userId: currentPlayer.userId,
          timeLeft: getTurnDuration(tournamentId),
        });
        startTurnTimer(io, tournamentId, currentPlayer.userId);
      }
    }
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

  // Calculate side pots and award chips correctly (supports split pots)
  const potResults = gameEngine.calculatePots(state);
  const newState = structuredClone(state) as gameEngine.GameState;

  // Award each pot to its winner(s). For uneven splits, the leftover chip
  // ("odd chip rule") goes to the winner closest to the small blind.
  for (const pot of potResults) {
    const sortedWinners = sortIdsByPositionFromSB(pot.winnerIds, newState);
    const share = Math.floor(pot.amount / sortedWinners.length);
    const remainder = pot.amount - share * sortedWinners.length;
    sortedWinners.forEach((uid, i) => {
      const winner = newState.players.find(p => p.userId === uid);
      if (winner) winner.chips += share + (i === 0 ? remainder : 0);
    });
  }
  newState.pot = 0;

  // Use the main pot winner for the result event
  const mainPot = potResults.length > 0 ? potResults[0] : { winnerIds: [0], amount: 0, handName: 'Unknown' };
  const totalAwarded = potResults.reduce((sum, p) => sum + p.amount, 0);

  io.to(`tournament:${tournamentId}`).emit('game:result', {
    winnerId: mainPot.winnerIds[0],
    pot: totalAwarded,
    handName: mainPot.handName,
  });

  // Eliminate players with 0 chips
  newState.players.forEach((p) => {
    if (p.chips === 0) p.status = 'eliminated';
  });

  // Bounty: award MMR for eliminations in bounty format
  const format = tournamentFormats.get(tournamentId);
  if (format === '5-player-bounty') {
    const newlyEliminated = newState.players.filter(p => p.chips === 0);
    if (newlyEliminated.length > 0 && mainPot.winnerIds.length > 0) {
      const totalBounty = newlyEliminated.length * 10;
      const sortedBountyWinners = sortIdsByPositionFromSB(mainPot.winnerIds, newState);
      const winnerCount = sortedBountyWinners.length;
      const sharePerWinner = Math.floor(totalBounty / winnerCount);
      const remainder = totalBounty - sharePerWinner * winnerCount;

      for (const [i, winnerId] of sortedBountyWinners.entries()) {
        const award = sharePerWinner + (i === 0 ? remainder : 0);
        try {
          await db.query('UPDATE users SET mmr = GREATEST(0, mmr + $1) WHERE id = $2', [award, winnerId]);
          // Record bounty in tournament_players so the stats endpoint can
          // reconstruct the user's MMR history accurately.
          await db.query(
            'UPDATE tournament_players SET mmr_change = COALESCE(mmr_change, 0) + $1 WHERE tournament_id = $2 AND user_id = $3',
            [award, tournamentId, winnerId]
          );
        } catch (err) {
          console.error('[Game] bounty DB update failed', err);
        }
        // Each winner sees their own bonus toast (split pot → split bounty)
        io.to(`tournament:${tournamentId}`).emit('bounty:kill', {
          killerId: winnerId,
          eliminated: newlyEliminated.map(p => p.userId),
          bonus: award,
        });
      }
    }
  }

  const stillAlive = newState.players.filter((p) => p.status !== 'eliminated');

  if (stillAlive.length <= 1) {
    // Tournament over
    const sorted = [...newState.players].sort((a, b) => b.chips - a.chips);
    const resolvedFormat = tournamentFormats.get(tournamentId) ?? (newState.players.length === 2 ? '1v1' : '5-player');
    const places = sorted.map((p, i) => ({ userId: p.userId, place: i + 1 }));
    const mmrChanges = calculateMMRChanges(places, resolvedFormat);

    try {
      await db.query(
        'UPDATE tournaments SET status = $1, finished_at = NOW() WHERE id = $2',
        ['finished', tournamentId]
      );
      for (const { userId, place } of places) {
        const mmrChange = mmrChanges.find((m) => m.userId === userId)?.mmrChange ?? 0;
        // ADD to existing mmr_change so bounty bonuses are preserved.
        await db.query(
          'UPDATE tournament_players SET place = $1, mmr_change = COALESCE(mmr_change, 0) + $2 WHERE tournament_id = $3 AND user_id = $4',
          [place, mmrChange, tournamentId, userId]
        );
        await db.query(
          'UPDATE users SET mmr = GREATEST(0, mmr + $1) WHERE id = $2',
          [mmrChange, userId]
        );
      }
    } catch (err) {
      console.error('[Game] tournament finalisation DB update failed', err);
    }

    const endPayload = places.map((p) => ({
      ...p,
      name: playerNames.get(tournamentId)?.get(p.userId)?.name ?? String(p.userId),
      mmrChange: mmrChanges.find((m) => m.userId === p.userId)?.mmrChange ?? 0,
    }));

    // Always emit game:end and clean up in-memory state, even if DB writes
    // failed — otherwise the tournament leaks forever.
    io.to(`tournament:${tournamentId}`).emit('game:end', { places: endPayload });
    gameStates.delete(tournamentId);
    playerNames.delete(tournamentId);
    tournamentFormats.delete(tournamentId);
  } else {
    // 3-second delay for card reveal before next hand
    newState.stage = 'showdown';
    gameStates.set(tournamentId, newState);
    broadcastGameState(io, newState);

    setTimeout(() => {
      // Start next hand with carried-over chips and rotated dealer
      const nextState = gameEngine.createGameState(
        tournamentId,
        stillAlive.map((p) => {
          const prev = newState.players.find((pp) => pp.userId === p.userId);
          return { userId: p.userId, chips: prev?.chips ?? 1000 };
        }),
        newState.dealerUserId
      );
      gameStates.set(tournamentId, nextState);
      broadcastGameState(io, nextState);
      const currentPlayer = nextState.players[nextState.currentPlayerIndex];
      io.to(`tournament:${tournamentId}`).emit('game:turn', {
        userId: currentPlayer.userId,
        timeLeft: getTurnDuration(tournamentId),
      });
      startTurnTimer(io, tournamentId, currentPlayer.userId);
    }, 3000);
  }
}

async function createTournament(
  format: GameFormat,
  players: matchmaking.QueueEntry[]
): Promise<number> {
  // Insert tournaments + tournament_players inside a transaction so a
  // failure mid-loop doesn't leave an orphan tournament row.
  const client = await db.connect();
  let tournamentId: number;
  try {
    await client.query('BEGIN');
    const result = await client.query<{ id: number }>(
      `INSERT INTO tournaments (status, format, started_at) VALUES ('in_progress', $1, NOW()) RETURNING id`,
      [format]
    );
    tournamentId = result.rows[0].id;
    for (const p of players) {
      await client.query(
        'INSERT INTO tournament_players (tournament_id, user_id) VALUES ($1, $2)',
        [tournamentId, p.userId]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  tournamentFormats.set(tournamentId, format);

  // Fetch and store player names/avatars
  const usersResult = await db.query<{ id: number; name: string; avatar_url?: string; is_premium?: boolean }>(
    'SELECT id, name, avatar_url, is_premium FROM users WHERE id = ANY($1)',
    [players.map((p) => p.userId)]
  );
  const names = new Map<number, { name: string; avatarUrl?: string; isPremium?: boolean }>();
  for (const row of usersResult.rows) {
    names.set(row.id, { name: row.name, avatarUrl: row.avatar_url ?? undefined, isPremium: row.is_premium ?? false });
  }
  playerNames.set(tournamentId, names);

  return tournamentId;
}

export function clearAllGames(): void {
  gameStates.clear();
  playerNames.clear();
  for (const timer of turnTimers.values()) clearTimeout(timer);
  turnTimers.clear();
  tournamentFormats.clear();
}

export function getOnlineStats(io: Server): { online: number; inQueue: number; inGames: number } {
  // Count unique authenticated users
  const uniqueUserIds = new Set<number>();
  io.sockets.sockets.forEach((socket) => {
    const uid = (socket.data as { userId?: number }).userId;
    if (uid !== undefined) uniqueUserIds.add(uid);
  });

  // Sum all matchmaking queue sizes
  const formats: GameFormat[] = ['1v1', '5-player', '1v1-turbo', '5-player-bounty'];
  const inQueue = formats.reduce((sum, fmt) => sum + matchmaking.getQueueSize(fmt), 0);

  // Count non-eliminated players across all active games
  let inGames = 0;
  for (const state of gameStates.values()) {
    inGames += state.players.filter((p) => p.status !== 'eliminated').length;
  }

  return { online: uniqueUserIds.size, inQueue, inGames };
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

      let tournamentId: number;
      try {
        tournamentId = await createTournament(format, matched);
      } catch (err) {
        console.error('[MM] createTournament failed', err);
        continue;
      }
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
    const cookies = app.parseCookie(cookieHeader) as Record<string, string | undefined>;
    const token = cookies.token;
    if (!token) {
      socket.disconnect();
      return;
    }
    try {
      const payload = app.jwt.verify<JwtPayload>(token);
      socket.data = { userId: payload.id };
    } catch {
      socket.disconnect();
      return;
    }

    const userId = (socket.data as { userId: number }).userId;
    console.log(`[Socket] Connected: user=${userId} socket=${socket.id}`);

    socket.on('join-queue', (data: { format: GameFormat; mmr: number }) => {
      // Prevent joining queue if already in an active game
      for (const state of gameStates.values()) {
        if (state.players.some(p => p.userId === userId && p.status !== 'eliminated')) {
          socket.emit('queue:error', { message: 'Already in an active game' });
          return;
        }
      }
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
      // Send current turn info so reconnecting player sees timer
      const currentPlayer = state.players[state.currentPlayerIndex];
      if (currentPlayer && currentPlayer.status === 'active') {
        socket.emit('game:turn', {
          userId: currentPlayer.userId,
          timeLeft: getTurnDuration(data.tournamentId),
        });
      }
    });

    socket.on(
      'game:action',
      async (data: { action: 'fold' | 'check' | 'call' | 'raise'; amount?: number }) => {
        // Find tournament this socket is in (via rooms)
        let tournamentId: number | undefined;
        for (const room of socket.rooms) {
          const match = room.match(/^tournament:(\d+)$/);
          if (match) {
            const tid = parseInt(match[1], 10);
            const state = gameStates.get(tid);
            if (state && state.players.some(p => p.userId === userId)) {
              tournamentId = tid;
              break;
            }
          }
        }
        if (!tournamentId) return;

        const state = gameStates.get(tournamentId);
        if (!state) return;

        const newState = gameEngine.processAction(state, userId, data.action, data.amount);
        if (newState === state) {
          // Action rejected — don't kill the timer, notify the client.
          socket.emit('game:error', { message: 'Invalid action' });
          return;
        }

        clearTurnTimer(tournamentId);
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

    socket.on('game:surrender', async () => {
      // Find the tournament this player is in
      let tournamentId: number | undefined;
      for (const room of socket.rooms) {
        const match = room.match(/^tournament:(\d+)$/);
        if (match) {
          const tid = parseInt(match[1], 10);
          const state = gameStates.get(tid);
          if (state && state.players.some(p => p.userId === userId)) {
            tournamentId = tid;
            break;
          }
        }
      }
      if (!tournamentId) return;

      const state = gameStates.get(tournamentId);
      if (!state) return;

      const newState = gameEngine.processSurrender(state, userId);
      if (newState === state) return; // already eliminated / not in game

      // If the turn just changed (surrendering player was current), kill timer.
      if (newState.currentPlayerIndex !== state.currentPlayerIndex) {
        clearTurnTimer(tournamentId);
      }

      gameStates.set(tournamentId, newState);
      broadcastGameState(io, newState);

      // Check if hand/tournament should end
      const stillIn = newState.players.filter(p => p.status === 'active' || p.status === 'all-in');
      if (stillIn.length <= 1) {
        await finishHand(io, tournamentId, newState);
      } else if (gameEngine.isBettingRoundOver(newState)) {
        await advanceIfNeeded(io, tournamentId, newState);
      } else {
        const next = newState.players[newState.currentPlayerIndex];
        if (next && next.status === 'active') {
          io.to(`tournament:${tournamentId}`).emit('game:turn', {
            userId: next.userId,
            timeLeft: getTurnDuration(tournamentId),
          });
          startTurnTimer(io, tournamentId, next.userId);
        }
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: user=${userId} socket=${socket.id} reason=${reason}`);
      matchmaking.leaveAllQueues(userId);
    });
  });
}
