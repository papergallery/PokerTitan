export function calculateMMRChanges(
  places: Array<{ userId: number; place: number }>,
  format: '1v1' | '5-player'
): Array<{ userId: number; mmrChange: number }> {
  const changes1v1: Record<number, number> = { 1: 20, 2: -20 };
  const changes5player: Record<number, number> = {
    1: 25,
    2: 10,
    3: -5,
    4: -15,
    5: -25,
  };

  const table = format === '1v1' ? changes1v1 : changes5player;

  return places.map(({ userId, place }) => ({
    userId,
    mmrChange: table[place] ?? 0,
  }));
}
