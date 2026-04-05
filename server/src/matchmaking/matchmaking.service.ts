export interface QueueEntry {
  userId: number;
  mmr: number;
  joinedAt: Date;
  socketId: string;
}

const queue1v1: QueueEntry[] = [];
const queue5player: QueueEntry[] = [];

function getQueue(format: '1v1' | '5-player'): QueueEntry[] {
  return format === '1v1' ? queue1v1 : queue5player;
}

export function joinQueue(entry: QueueEntry, format: '1v1' | '5-player'): void {
  const queue = getQueue(format);
  // Avoid duplicates
  if (!queue.find((e) => e.userId === entry.userId)) {
    queue.push(entry);
  }
}

export function leaveQueue(userId: number, format: '1v1' | '5-player'): void {
  const queue = getQueue(format);
  const idx = queue.findIndex((e) => e.userId === userId);
  if (idx !== -1) queue.splice(idx, 1);
}

export function leaveAllQueues(userId: number): void {
  leaveQueue(userId, '1v1');
  leaveQueue(userId, '5-player');
}

export function tryMatch(format: '1v1' | '5-player'): QueueEntry[] | null {
  const queue = getQueue(format);
  const needed = format === '1v1' ? 2 : 5;

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

    if (maxMmr - minMmr <= mmrRange) {
      // Remove matched players from queue
      for (const entry of group) {
        leaveQueue(entry.userId, format);
      }
      return group;
    }
  }

  return null;
}
