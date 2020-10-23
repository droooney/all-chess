import { SquareColorTheme } from 'client/types/game';
import { GameVariantEnum, TimeControl } from 'shared/types/game';

export interface GameSettings {
  showFantomPieces: boolean;
  lastPlayedRated: boolean;
  lastPlayedTimeControl: TimeControl;
  favouriteVariants: GameVariantEnum[][];
  lastPlayedVariants: GameVariantEnum[];
  squareColorTheme: SquareColorTheme;
}
