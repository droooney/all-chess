import * as _ from 'lodash';

import { ColorEnum, GameSettings, PieceLocationEnum, PieceTypeEnum } from '../../types';

export const GAME_DEFAULT_SETTINGS: { [key in keyof GameSettings]: GameSettings[key]; } = {
  showFantomPieces: true,
  timeControl: null
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

export const pocketPieces = _.mapValues(ColorEnum, (color) => (
  _.mapValues(PieceTypeEnum, (pieceType) => ({
    color,
    type: pieceType,
    location: {
      type: PieceLocationEnum.POCKET as PieceLocationEnum.POCKET,
      pieceType,
      color
    }
  }))
));
