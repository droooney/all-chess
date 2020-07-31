import { GameVariantEnum, TimeControl } from 'shared/types/game';
import { SquareColorTheme } from 'client/types/game';

export interface GameSettings {
  showFantomPieces: boolean;
  timeControl: TimeControl;
  favouriteVariants: GameVariantEnum[][];
  lastPlayedVariants: GameVariantEnum[];
  squareColorTheme: SquareColorTheme;
}
