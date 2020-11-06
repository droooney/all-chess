import * as React from 'react';

import { SVG_SQUARE_SIZE } from 'client/constants';

import { PieceBoardLocation, PieceLocationEnum, RealPieceLocation, Square } from 'shared/types';

import { Game } from 'client/helpers';

export interface BoardSquareProps {
  game: Game;
  board: number;
  fileX: number;
  rankY: number;

  onSquareClick?(square: Square): void;
  onPieceDragStart?(e: React.MouseEvent | React.TouchEvent, location: RealPieceLocation): void;
}

type Props = BoardSquareProps & (React.SVGProps<SVGPathElement> | React.SVGProps<SVGRectElement>);

export default class BoardSquare extends React.PureComponent<Props> {
  render() {
    const {
      game,
      board,
      fileX,
      rankY,
      onSquareClick,
      onPieceDragStart,
      ...elemProps
    } = this.props;
    const {
      isCircularChess,
      isHexagonalChess,
      boardHeight,
    } = game;
    const square: Square = {
      board,
      x: fileX,
      y: rankY,
    };
    const location: PieceBoardLocation = {
      ...square,
      type: PieceLocationEnum.BOARD,
    };

    const translateX = `calc(${SVG_SQUARE_SIZE}px * ${fileX} + var(--file-${fileX}-transform, 0px))`;
    const translateY = `calc(${SVG_SQUARE_SIZE}px * ${boardHeight - 1 - rankY})`;
    const baseParams = {
      'data-square': JSON.stringify(square),
      'data-board': square.board,
      'data-file-x': square.x,
      'data-rank-y': square.y,
      style: {
        transform: [
          'rotate(calc(180deg * var(--is-black-base, 0)))',
          ...(
            isCircularChess || isHexagonalChess
              ? []
              : [`translate(${translateX}, ${translateY})`]
          ),
        ].join(' '),
        transformOrigin: `${game.boardCenterX}px ${game.boardCenterY}px`,
      },
      onClick: onSquareClick && (() => onSquareClick(square)),
      onMouseDown: onPieceDragStart && ((e: React.MouseEvent) => onPieceDragStart(e, location)),
      onTouchStart: onPieceDragStart && ((e: React.TouchEvent) => onPieceDragStart(e, location)),
    };
    let pathD = '';

    if (isCircularChess) {
      const {
        outer: rOuter,
        inner: rInner,
      } = game.getCircularRadiuses(square);
      const circularPoints = game.getCircularPoints(square);

      pathD = `
        M ${circularPoints.outerFirst.x},${circularPoints.outerFirst.y}
        A ${rOuter} ${rOuter} 0 0 1 ${circularPoints.outerSecond.x} ${circularPoints.outerSecond.y}
        L ${circularPoints.innerSecond.x},${circularPoints.innerSecond.y}
        A ${rInner} ${rInner} 0 0 0 ${circularPoints.innerFirst.x} ${circularPoints.innerFirst.y}
        Z
      `;
    } else if (isHexagonalChess) {
      const hexPoints = game.getHexPoints(square);

      pathD = `
        M ${hexPoints.topLeft.x},${hexPoints.topLeft.y}
        L ${hexPoints.left.x},${hexPoints.left.y}
        L ${hexPoints.bottomLeft.x},${hexPoints.bottomLeft.y}
        L ${hexPoints.bottomRight.x},${hexPoints.bottomRight.y}
        L ${hexPoints.right.x},${hexPoints.right.y}
        L ${hexPoints.topRight.x},${hexPoints.topRight.y}
        Z
      `;
    }

    return (
      isCircularChess || isHexagonalChess ? (
        <path
          d={pathD}
          {...baseParams}
          {...elemProps as React.SVGProps<SVGPathElement>}
        />
      ) : (
        <rect
          width={SVG_SQUARE_SIZE}
          height={SVG_SQUARE_SIZE}
          {...baseParams}
          {...elemProps as React.SVGProps<SVGRectElement>}
        />
      )
    );
  }
}
