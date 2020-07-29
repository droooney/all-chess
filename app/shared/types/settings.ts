import { GameVariantEnum, TimeControl } from './game';

export interface GameSettings {
  showFantomPieces: boolean;
  timeControl: TimeControl;
  favouriteVariants: GameVariantEnum[][];
  lastPlayedVariants: GameVariantEnum[];
}
