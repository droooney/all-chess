import * as React from 'react';
import classNames from 'classnames';

import {
  ColorEnum,
  PieceLocation,
  PieceTypeEnum
} from '../../../shared/types';

import King from './King';
import Amazon from './Amazon';
import Queen from './Queen';
import Empress from './Empress';
import Cardinal from './Cardinal';
import Rook from './Rook';
import Bishop from './Bishop';
import Knight from './Knight';
import Pawn from './Pawn';

interface OwnProps<T extends PieceLocation> {
  color: ColorEnum;
  type: PieceTypeEnum;
  location: T;

  x?: number;
  y?: number;
  width?: number;
  height?: number;
  transform?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?(location: T): void;
  onDragStart?(e: React.MouseEvent | React.TouchEvent, location: T): void;
}

type Props<T extends PieceLocation> = OwnProps<T>;

export default class Piece<T extends PieceLocation> extends React.PureComponent<Props<T>> {
  onClick = () => {
    const {
      location,
      onClick
    } = this.props;

    onClick!(location);
  };

  onDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    const {
      location,
      onDragStart
    } = this.props;

    onDragStart!(e, location);
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
      color,
      type,
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
        onTouchStart={onDragStart && this.onDragStart}
      >
        {type === PieceTypeEnum.KING ? (
          <King color={color} />
        ) : type === PieceTypeEnum.AMAZON ? (
          <Amazon color={color} />
        ) : type === PieceTypeEnum.QUEEN ? (
          <Queen color={color} />
        ) : type === PieceTypeEnum.EMPRESS ? (
          <Empress color={color} />
        ) : type === PieceTypeEnum.CARDINAL ? (
          <Cardinal color={color} />
        ) : type === PieceTypeEnum.ROOK ? (
          <Rook color={color} />
        ) : type === PieceTypeEnum.BISHOP ? (
          <Bishop color={color} />
        ) : type === PieceTypeEnum.KNIGHT ? (
          <Knight color={color} />
        ) : type === PieceTypeEnum.PAWN ? (
          <Pawn color={color} />
        ) : null}
      </svg>
    );
  }
}
