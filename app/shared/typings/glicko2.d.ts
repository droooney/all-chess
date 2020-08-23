declare module 'glicko2' {
  export interface Settings {
    tau?: number;
    rating?: number;
    rd?: number;
    vol?: number;
  }

  export interface Player {
    getRating(): number;
    setRating(rating: number): void;
    getRd(): number;
    setRd(rd: number): void;
    getVol(): number;
    setVol(vol: number): void;
  }

  export class Glicko2 {
    players: Player[];

    constructor(settings?: Settings);

    getPlayers(): Player[];
    makePlayer(rating?: number, rd?: number, vol?: number): Player;
    removePlayers(): void;
    updateRatings(matches: [Player, Player, number][]): void;
  }
}
