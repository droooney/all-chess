import * as React from 'react';

import { Game } from 'client/helpers';
import { PieceBoardLocation, PieceLocationEnum, RealPieceLocation, Square } from '../../../shared/types';
import { SVG_SQUARE_SIZE, CIRCULAR_CHESS_EMPTY_CENTER_RATIO } from '../../constants';

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
      boardWidth,
      boardHeight,
      boardOrthodoxWidth
    } = game;
    const square: Square = {
      board,
      x: fileX,
      y: rankY
    };
    const location: PieceBoardLocation = {
      ...square,
      type: PieceLocationEnum.BOARD
    };

    const translateX = `calc(${SVG_SQUARE_SIZE}px * var(--rendered-file-${fileX}, ${fileX}))`;
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
          )
        ].join(' '),
        transformOrigin: `${game.boardCenterX}px ${game.boardCenterY}px`
      },
      onClick: onSquareClick && (() => onSquareClick(square)),
      onMouseDown: onPieceDragStart && ((e: React.MouseEvent) => onPieceDragStart(e, location)),
      onTouchStart: onPieceDragStart && ((e: React.TouchEvent) => onPieceDragStart(e, location))
    };
    let pathD = '';

    if (isCircularChess) {
      const rOuter = boardWidth * SVG_SQUARE_SIZE;
      const rDiff = (1 - CIRCULAR_CHESS_EMPTY_CENTER_RATIO) * SVG_SQUARE_SIZE;
      const r = rOuter - fileX * rDiff;
      const nextR = r - rDiff;
      const angle = rankY * 2 * Math.PI / game.boardHeight;
      const nextAngle = (rankY + 1) * 2 * Math.PI / game.boardHeight;
      const getCirclePoint = (r: number, angle: number) => {
        const x = game.boardCenterX - r * Math.sin(angle);
        const y = game.boardCenterY - r * Math.cos(angle);

        return { x, y: boardOrthodoxWidth * SVG_SQUARE_SIZE - y };
      };
      const circlePoints = [
        getCirclePoint(r, angle),
        getCirclePoint(r, nextAngle),
        getCirclePoint(nextR, nextAngle),
        getCirclePoint(nextR, angle)
      ];

      pathD = `
        M ${circlePoints[0].x},${circlePoints[0].y}
        A ${r} ${r} 0 0 1 ${circlePoints[1].x} ${circlePoints[1].y}
        L ${circlePoints[2].x},${circlePoints[2].y}
        A ${nextR} ${nextR} 0 0 0 ${circlePoints[3].x} ${circlePoints[3].y}
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
