import mapValues from 'lodash/mapValues';
import values from 'lodash/values';

import {
  ColorEnum,
  DrawnSymbolColor,
  GameVariantEnum,
  PieceLocationEnum,
  PieceTypeEnum,
} from 'shared/types';
import { SquareColorTheme, GameSettings } from 'client/types';

export const GAME_DEFAULT_SETTINGS: { [key in keyof GameSettings]: GameSettings[key]; } = {
  showFantomPieces: true,
  lastPlayedRated: false,
  lastPlayedTimeControl: null,
  favouriteVariants: [],
  lastPlayedVariants: [],
  squareColorTheme: SquareColorTheme.CLASSIC,
};

export const SVG_SQUARE_SIZE = 60;
export const CIRCULAR_CHESS_EMPTY_CENTER_RATIO = 1 / 3;
export const ALICE_CHESS_BOARDS_MARGIN = 20;
export const GAME_GRID_GAP = 20;
export const MIN_LEFT_DESKTOP_PANEL_WIDTH = 200;
export const MAX_LEFT_DESKTOP_PANEL_WIDTH = 300;
export const MIN_RIGHT_DESKTOP_PANEL_WIDTH = 200;
export const MAX_RIGHT_DESKTOP_PANEL_WIDTH = 300;
export const MIN_TABLET_PANEL_WIDTH = 200;
export const MAX_TABLET_PANEL_WIDTH = 300;

export const STANDARD_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const pocketPieces = mapValues(ColorEnum, (color) => (
  mapValues(PieceTypeEnum, (pieceType) => ({
    color,
    type: pieceType,
    location: {
      type: PieceLocationEnum.POCKET as PieceLocationEnum.POCKET,
      pieceType,
      color,
    },
  }))
));

export const DRAWN_SYMBOL_COLORS: Record<DrawnSymbolColor, string> = {
  [DrawnSymbolColor.GREEN]: '#080',
  [DrawnSymbolColor.BLUE]: '#0bf',
  [DrawnSymbolColor.RED]: '#f00',
  [DrawnSymbolColor.YELLOW]: '#fa0',
};

export const ALL_VARIANTS = values(GameVariantEnum).sort();
