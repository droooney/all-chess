import * as React from 'react';
import classNames from 'classNames';

import {
  PieceTypeEnum,
  RealPiece,
  RealPieceLocation
} from '../../../types';

import King from './King';
import Amazon from './Amazon';
import Queen from './Queen';
import Empress from './Empress';
import Cardinal from './Cardinal';
import Rook from './Rook';
import Bishop from './Bishop';
import Knight from './Knight';
import Pawn from './Pawn';

interface OwnProps {
  piece: Partial<RealPiece> & Pick<RealPiece, 'color' | 'type' | 'location'>;

  x?: number;
  y?: number;
  width?: number;
  height?: number;
  transform?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?(location: RealPieceLocation): void;
  onDragStart?(e: React.MouseEvent, location: RealPieceLocation): void;
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

  onDragStart = (e: React.MouseEvent) => {
    const {
      piece,
      onDragStart
    } = this.props;

    onDragStart!(e, piece.location);
  };

  render() {
    const {
      className,
      style,
      x,
      y,
      width,
      height,
      transform,
      piece,
      onClick,
      onDragStart
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
        x={x}
        y={y}
        width={width}
        height={height}
        transform={transform}
        onClick={onClick && this.onClick}
        onMouseDown={onDragStart && this.onDragStart}
      >
        {piece.type === PieceTypeEnum.KING ? (
          <King color={piece.color} />
        ) : piece.type === PieceTypeEnum.AMAZON ? (
          <Amazon color={piece.color} />
        ) : piece.type === PieceTypeEnum.QUEEN ? (
          <Queen color={piece.color} />
        ) : piece.type === PieceTypeEnum.EMPRESS ? (
          <Empress color={piece.color} />
        ) : piece.type === PieceTypeEnum.CARDINAL ? (
          <Cardinal color={piece.color} />
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
