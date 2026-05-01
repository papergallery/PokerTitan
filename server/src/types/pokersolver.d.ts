declare module 'pokersolver' {
  export interface SolvedHand {
    name: string;
    rank: number;
    descr: string;
  }
  export const Hand: {
    solve(cards: string[]): SolvedHand;
    winners(hands: SolvedHand[]): SolvedHand[];
  };
}
