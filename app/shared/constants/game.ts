import {
  ColorEnum,
  PieceEnum
} from '../../types';

export const SHORT_PIECE_NAMES: { [piece in PieceEnum]: string } = {
  [PieceEnum.KING]: 'K',
  [PieceEnum.QUEEN]: 'Q',
  [PieceEnum.ROOK]: 'R',
  [PieceEnum.BISHOP]: 'B',
  [PieceEnum.KNIGHT]: 'N',
  [PieceEnum.PAWN]: ''
};

export const STROKE_COLORS: { [color in ColorEnum]: ColorEnum } = {
  [ColorEnum.WHITE]: ColorEnum.BLACK,
  [ColorEnum.BLACK]: ColorEnum.WHITE
};
