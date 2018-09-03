import * as React from 'react';

import {
  Piece as IPiece,
  PieceEnum
} from '../../../types';

import King from './King';
import Queen from './Queen';
import Rook from './Rook';
import Bishop from './Bishop';
import Knight from './Knight';
import Pawn from './Pawn';

interface OwnProps {
  piece: IPiece;
}

type Props = OwnProps;

export default class Piece extends React.Component<Props> {
  render() {
    const {
      piece
    } = this.props;

    return (
      <svg
        className="piece"
        viewBox="0 0 45 45"
        fill="none"
        fillOpacity="1"
        fillRule="evenodd"
        stroke="#000"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeMiterlimit="4"
        strokeDasharray="none"
        strokeOpacity="1"
      >
        {piece.type === PieceEnum.KING ? (
          <King color={piece.color} />
        ) : piece.type === PieceEnum.QUEEN ? (
          <Queen color={piece.color} />
        ) : piece.type === PieceEnum.ROOK ? (
          <Rook color={piece.color} />
        ) : piece.type === PieceEnum.BISHOP ? (
          <Bishop color={piece.color} />
        ) : piece.type === PieceEnum.KNIGHT ? (
          <Knight color={piece.color} />
        ) : piece.type === PieceEnum.PAWN ? (
          <Pawn color={piece.color} />
        ) : null}
      </svg>
    );
  }
}
