import * as React from 'react';

import {
  Piece as IPiece,
  PieceEnum,
  Square
} from '../../../types';

import King from './King';
import Queen from './Queen';
import Rook from './Rook';
import Bishop from './Bishop';
import Knight from './Knight';
import Pawn from './Pawn';

interface OwnProps {
  piece: IPiece;
  isBlackBase: boolean;
  maxRank: number;
  maxFile: number;
  onClick?(square: Square): void;
}

type Props = OwnProps;

export default class Piece extends React.Component<Props> {
  onClick = () => {
    const {
      piece,
      onClick
    } = this.props;

    onClick!(piece.square);
  };

  render() {
    const {
      piece,
      piece: {
        square: {
          x: pieceX,
          y: pieceY
        }
      },
      isBlackBase,
      maxFile,
      maxRank,
      onClick
    } = this.props;
    const x = isBlackBase
      ? maxFile - pieceX
      : pieceX;
    const y = isBlackBase
      ? pieceY
      : maxRank - pieceY;

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
        style={{
          transform: `translate(${x * 70}px,${y * 70}px)`
        }}
        onClick={onClick && this.onClick}
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
