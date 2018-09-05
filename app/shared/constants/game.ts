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
  [PieceEnum.PAWN]: 'P'
};

export const PIECE_LITERALS: { [color in ColorEnum]: { [piece in PieceEnum]: string; }; } = {
  [ColorEnum.WHITE]: {
    [PieceEnum.KING]: '♔',
    [PieceEnum.QUEEN]: '♕',
    [PieceEnum.ROOK]: '♖',
    [PieceEnum.BISHOP]: '♗',
    [PieceEnum.KNIGHT]: '♘',
    [PieceEnum.PAWN]: '♙'
  },
  [ColorEnum.BLACK]: {
    [PieceEnum.KING]: '♚',
    [PieceEnum.QUEEN]: '♛',
    [PieceEnum.ROOK]: '♜',
    [PieceEnum.BISHOP]: '♝',
    [PieceEnum.KNIGHT]: '♞',
    [PieceEnum.PAWN]: '♟'
  }
};
