import * as React from 'react';
import classNames = require('classnames');

import {
  PieceTypeEnum,
  RealPiece,
  RealPieceLocation
} from '../../../types';

import King from './King';
import Queen from './Queen';
import Rook from './Rook';
import Bishop from './Bishop';
import Knight from './Knight';
import Pawn from './Pawn';

interface OwnProps {
  piece: Partial<RealPiece> & Pick<RealPiece, 'color' | 'type' | 'location'>;
  className?: string;
  style?: React.CSSProperties;
  onClick?(location: RealPieceLocation): void;
}

type Props = OwnProps;

export default class Piece extends React.Component<Props> {
  onClick = () => {
    const {
      piece,
      onClick
    } = this.props;

    onClick!(piece.location);
  };

  render() {
    const {
      className,
      style,
      piece,
      onClick
    } = this.props;

    return (
      <svg
        className={classNames('piece', className)}
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
        style={style}
        onClick={onClick && this.onClick}
      >
        {piece.type === PieceTypeEnum.KING ? (
          <King color={piece.color} />
        ) : piece.type === PieceTypeEnum.QUEEN ? (
          <Queen color={piece.color} />
        ) : piece.type === PieceTypeEnum.ROOK ? (
          <Rook color={piece.color} />
        ) : piece.type === PieceTypeEnum.BISHOP ? (
          <Bishop color={piece.color} />
        ) : piece.type === PieceTypeEnum.KNIGHT ? (
          <Knight color={piece.color} />
        ) : piece.type === PieceTypeEnum.PAWN ? (
          <Pawn color={piece.color} />
        ) : null}
      </svg>
    );
  }
}
