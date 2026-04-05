export function calculateMMRChanges(
  places: Array<{ userId: number; place: number }>,
  format: '1v1' | '5-player' | '1v1-turbo' | '5-player-bounty'
): Array<{ userId: number; mmrChange: number }> {
  const changes1v1: Record<number, number> = { 1: 20, 2: -20 };
  const changesTurbo: Record<number, number> = { 1: 15, 2: -15 }; // чуть меньше за скорость
  const changes5player: Record<number, number> = { 1: 25, 2: 10, 3: -5, 4: -15, 5: -25 };
  const changesBounty: Record<number, number> = { 1: 15, 2: 5, 3: -5, 4: -10, 5: -15 }; // меньше — остальное через bounty kills

  const table =
    format === '1v1-turbo' ? changesTurbo :
    format === '5-player-bounty' ? changesBounty :
    format === '5-player' ? changes5player :
    changes1v1;

  return places.map(({ userId, place }) => ({
    userId,
    mmrChange: table[place] ?? 0,
  }));
}
