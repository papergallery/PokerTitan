export type GameFormat = '1v1' | '5-player' | '1v1-turbo' | '5-player-bounty';

export interface QueueEntry {
  userId: number;
  mmr: number;
  joinedAt: Date;
  socketId: string;
}

const queue1v1: QueueEntry[] = [];
const queue5player: QueueEntry[] = [];
const queue1v1turbo: QueueEntry[] = [];
const queue5playerBounty: QueueEntry[] = [];

function getQueue(format: GameFormat): QueueEntry[] {
  if (format === '1v1') return queue1v1;
  if (format === '5-player') return queue5player;
  if (format === '1v1-turbo') return queue1v1turbo;
  return queue5playerBounty;
}

function logQueue(format: GameFormat): void {
  const queue = getQueue(format);
  if (queue.length === 0) return;
  const entries = queue.map(
    (e) => `  user=${e.userId} mmr=${e.mmr} socket=${e.socketId || '(none)'} wait=${Math.round((Date.now() - e.joinedAt.getTime()) / 1000)}s`
  );
  console.log(`[MM] Queue ${format} (${queue.length}):\n${entries.join('\n')}`);
}

export function joinQueue(entry: QueueEntry, format: GameFormat): void {
  const queue = getQueue(format);
  const existing = queue.find((e) => e.userId === entry.userId);
  if (existing) {
    if (entry.socketId) {
      console.log(`[MM] user=${entry.userId} updated socketId → ${entry.socketId} (${format})`);
      existing.socketId = entry.socketId;
    } else {
      console.log(`[MM] user=${entry.userId} already in queue ${format}, skipped (no socketId)`);
    }
  } else {
    queue.push(entry);
    console.log(`[MM] user=${entry.userId} mmr=${entry.mmr} joined ${format} via ${entry.socketId ? 'socket' : 'REST'}`);
    logQueue(format);
  }
}

export function leaveQueue(userId: number, format: GameFormat): void {
  const queue = getQueue(format);
  const idx = queue.findIndex((e) => e.userId === userId);
  if (idx !== -1) {
    queue.splice(idx, 1);
    console.log(`[MM] user=${userId} left queue ${format}`);
  }
}

export function leaveAllQueues(userId: number): void {
  leaveQueue(userId, '1v1');
  leaveQueue(userId, '5-player');
  leaveQueue(userId, '1v1-turbo');
  leaveQueue(userId, '5-player-bounty');
}

export function getQueueSize(format: GameFormat): number {
  return getQueue(format).length;
}

export function getQueueEntries(format: GameFormat): QueueEntry[] {
  return [...getQueue(format)];
}

export function tryMatch(format: GameFormat): QueueEntry[] | null {
  const queue = getQueue(format);
  const needed = (format === '1v1' || format === '1v1-turbo') ? 2 : 5;

  if (queue.length < needed) return null;

  // Sort by MMR
  queue.sort((a, b) => a.mmr - b.mmr);

  const now = new Date();

  // Try to find a group within MMR range
  for (let i = 0; i <= queue.length - needed; i++) {
    const group = queue.slice(i, i + needed);
    const minMmr = group[0].mmr;
    const maxMmr = group[needed - 1].mmr;

    // Expand range if someone has been waiting > 30 seconds
    const hasLongWaiter = group.some(
      (e) => now.getTime() - e.joinedAt.getTime() > 30_000
    );
    const mmrRange = hasLongWaiter ? 500 : 200;
    const diff = maxMmr - minMmr;

    console.log(`[MM] tryMatch ${format}: ${queue.length} in queue, diff=${diff}, range=${mmrRange}`);

    if (diff <= mmrRange) {
      for (const entry of group) {
        leaveQueue(entry.userId, format);
      }
      console.log(`[MM] MATCHED ${format}: ${group.map((e) => `user=${e.userId} socket=${e.socketId || '(none)'}`).join(', ')}`);
      return group;
    }
  }

  return null;
}
