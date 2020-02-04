import * as React from 'react';

import { Game } from '../../helpers';
import { PieceBoardLocation, PieceLocationEnum, RealPieceLocation, Square } from '../../../types';
import { CIRCULAR_CHESS_EMPTY_CENTER_RATIO } from '../../constants';

interface OwnProps {
  game: Game;
  board: number;
  fileX: number;
  rankY: number;
  squareSize: number;
  isBlackBase: boolean;
  boardsShiftX: number;

  onSquareClick?(square: Square): void;
  onPieceDragStart?(e: React.MouseEvent, location: RealPieceLocation): void;
}

type Props = OwnProps & (React.SVGProps<SVGPathElement> | React.SVGProps<SVGRectElement>);

export default class BoardSquare extends React.PureComponent<Props> {
  render() {
    const {
      game,
      board,
      fileX,
      rankY,
      squareSize,
      isBlackBase,
      boardsShiftX,
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
    const renderedFileX = game.adjustFileX(fileX + (isBlackBase ? -boardsShiftX : +boardsShiftX));

    const translateX = squareSize * (
      isBlackBase
        ? boardWidth - 1 - renderedFileX
        : renderedFileX
    );
    const translateY = squareSize * (
      isBlackBase
        ? rankY
        : boardHeight - 1 - rankY
    );
    const baseParams = {
      'data-square': JSON.stringify(square),
      transform: isCircularChess || isHexagonalChess
        ? undefined
        : `translate(${translateX}, ${translateY})`,
      onClick: onSquareClick ? (() => onSquareClick(square)) : undefined,
      onMouseDown: onPieceDragStart ? ((e: React.MouseEvent) => onPieceDragStart(e, location)) : undefined
    };
    let pathD = '';

    if (isCircularChess) {
      const maximumSize = Math.max(boardOrthodoxWidth, boardOrthodoxHeight);
      const half = maximumSize * squareSize / 2;
      const rOuter = boardWidth * squareSize;
      const rDiff = (1 - CIRCULAR_CHESS_EMPTY_CENTER_RATIO) * squareSize;
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
        const x = half - (right ? -1 : 1) * r * Math.sin(angle);
        const y = half - r * Math.cos(angle);

        return isBlackBase
          ? { x: maximumSize * squareSize - x, y }
          : { x, y: maximumSize * squareSize - y };
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
      const a = squareSize / 2 / Math.sqrt(3);
      const x0 = (
        isBlackBase
          ? (boardWidth - fileX) * 3
          : (fileX * 3) + 1
      ) * a;
      const rankAdjustmentY = 1 / 2 * Math.abs(fileX - middleFileX);
      const y0 = (
        isBlackBase
          ? rankY + rankAdjustmentY
          : boardHeight - rankY - rankAdjustmentY
      ) * squareSize;
      const hexPoint = (x: number, y: number) => (
        isBlackBase
          ? { x: -x, y }
          : { x, y: -y }
      );
      const hexPoints = [
        hexPoint(-a, squareSize / 2),
        hexPoint(a, squareSize / 2),
        hexPoint(2 * a, 0),
        hexPoint(a, -squareSize / 2),
        hexPoint(-a, -squareSize / 2)
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
          width={squareSize}
          height={squareSize}
          {...baseParams}
          {...elemProps as React.SVGProps<SVGRectElement>}
        />
      )
    );
  }
}
