import * as React from 'react';

import { Game } from '../../helpers';
import { PieceBoardLocation, PieceLocationEnum, RealPieceLocation, Square } from '../../../types';
import { SVG_SQUARE_SIZE, CIRCULAR_CHESS_EMPTY_CENTER_RATIO } from '../../constants';

export interface BoardSquareProps {
  game: Game;
  board: number;
  fileX: number;
  rankY: number;
  onSquareClick(square: Square): void;
  onPieceDragStart(e: React.MouseEvent | React.TouchEvent, location: RealPieceLocation): void;
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
      boardOrthodoxWidth,
      boardOrthodoxHeight,
      middleFileX
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
      onClick: () => onSquareClick(square),
      onMouseDown: (e: React.MouseEvent) => onPieceDragStart(e, location),
      onTouchStart: (e: React.TouchEvent) => onPieceDragStart(e, location)
    };
    let pathD = '';

    if (isCircularChess) {
      const rOuter = boardWidth * SVG_SQUARE_SIZE;
      const rDiff = (1 - CIRCULAR_CHESS_EMPTY_CENTER_RATIO) * SVG_SQUARE_SIZE;
      const adjustedRankY = rankY > boardOrthodoxHeight
        ? boardHeight - 1 - rankY
        : rankY;
      const adjustedFileX = rankY > boardOrthodoxHeight
        ? boardOrthodoxWidth - fileX
        : fileX;
      const right = rankY > boardOrthodoxHeight ? 1 : 0;
      const r = rOuter - (right ? boardOrthodoxWidth - adjustedFileX : adjustedFileX) * rDiff;
      const nextR = r - rDiff;
      const angle = adjustedRankY * Math.PI / 8;
      const nextAngle = (adjustedRankY + 1) * Math.PI / 8;
      const getCirclePoint = (r: number, angle: number) => {
        const x = game.boardCenterX - (right ? -1 : 1) * r * Math.sin(angle);
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
        A ${r} ${r} 0 0 ${1 - right} ${circlePoints[1].x} ${circlePoints[1].y}
        L ${circlePoints[2].x},${circlePoints[2].y}
        A ${nextR} ${nextR} 0 0 ${right} ${circlePoints[3].x} ${circlePoints[3].y}
        Z
      `;
    } else if (isHexagonalChess) {
      const a = SVG_SQUARE_SIZE / 2 / Math.sqrt(3);
      const x0 = (fileX * 3 + 1) * a;
      const rankAdjustmentY = 1 / 2 * Math.abs(fileX - middleFileX);
      const y0 = (boardHeight - rankY - rankAdjustmentY) * SVG_SQUARE_SIZE;
      const hexPoint = (x: number, y: number) => ({ x, y: -y });
      const hexPoints = [
        hexPoint(-a, SVG_SQUARE_SIZE / 2),
        hexPoint(a, SVG_SQUARE_SIZE / 2),
        hexPoint(2 * a, 0),
        hexPoint(a, -SVG_SQUARE_SIZE / 2),
        hexPoint(-a, -SVG_SQUARE_SIZE / 2)
      ];

      pathD = `
        M ${x0},${y0}
        l ${hexPoints[0].x},${hexPoints[0].y}
        l ${hexPoints[1].x},${hexPoints[1].y}
        h ${hexPoints[2].x}
        l ${hexPoints[3].x},${hexPoints[3].y}
        l ${hexPoints[4].x},${hexPoints[4].y}
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
