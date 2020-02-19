import * as React from 'react';

import { CIRCULAR_CHESS_EMPTY_CENTER_RATIO, SVG_SQUARE_SIZE } from '../../constants';

import { DrawnSymbol as IDrawnSymbol, Square } from '../../../types';

import { Game } from '../../helpers';

interface OwnProps {
  game: Game;
  symbol: IDrawnSymbol;
  boardsShiftX: number;
}

type Props = OwnProps;

export default class DrawnSymbol extends React.Component<Props> {
  getSquareCenter(square: Square): { x: number; y: number; } {
    const {
      game,
      boardsShiftX
    } = this.props;

    if (game.isCircularChess) {
      const rOuter = game.boardWidth * SVG_SQUARE_SIZE;
      const rDiff = (1 - CIRCULAR_CHESS_EMPTY_CENTER_RATIO) * SVG_SQUARE_SIZE;
      const r = rOuter - square.x * rDiff;
      const centerR = r - rDiff / 2;
      const centerAngle = (square.y + 0.5) * 2 * Math.PI / game.boardHeight;

      return {
        x: game.boardCenterX - centerR * Math.sin(centerAngle),
        y: game.boardOrthodoxWidth * SVG_SQUARE_SIZE - (game.boardCenterY - centerR * Math.cos(centerAngle))
      };
    }

    if (game.isHexagonalChess) {
      const a = SVG_SQUARE_SIZE / 2 / Math.sqrt(3);
      const x0 = (square.x * 3 + 1) * a;
      const rankAdjustmentY = 1 / 2 * Math.abs(square.x - game.middleFileX);
      const y0 = (game.boardHeight - square.y - rankAdjustmentY) * SVG_SQUARE_SIZE;

      return {
        x: x0 + a,
        y: y0 - SVG_SQUARE_SIZE / 2
      };
    }

    return {
      x: (game.adjustFileX(square.x + boardsShiftX) + 0.5) * SVG_SQUARE_SIZE,
      y: (game.boardHeight - square.y - 0.5) * SVG_SQUARE_SIZE
    };
  }

  render() {
    const {
      game,
      symbol
    } = this.props;
    const transformStyle: React.CSSProperties = {
      transform: 'rotate(calc(180deg * var(--is-black-base, 0)))',
      transformOrigin: `${game.boardCenterX}px ${game.boardCenterY}px`
    };

    if (symbol.type === 'circle') {
      const strokeWidth = SVG_SQUARE_SIZE / 20;
      const center = this.getSquareCenter(symbol.square);

      return (
        <circle
          className="drawn-symbol"
          r={(game.isCircularChess ? (1 - CIRCULAR_CHESS_EMPTY_CENTER_RATIO) : 1) * SVG_SQUARE_SIZE / 2 - strokeWidth / 2}
          cx={center.x}
          cy={center.y}
          strokeWidth={strokeWidth}
          fill="none"
          style={transformStyle}
        />
      );
    }

    const strokeWidth = SVG_SQUARE_SIZE / 10;
    const fromCenter = this.getSquareCenter(symbol.from);
    const toCenter = this.getSquareCenter(symbol.to);
    const angle = Math.atan(Math.abs((toCenter.y - fromCenter.y) / (toCenter.x - fromCenter.x)));
    const lineLength = Math.hypot(toCenter.x - fromCenter.x, toCenter.y - fromCenter.y) - 2 * strokeWidth;
    const adjustedToCenter = {
      x: fromCenter.x + Math.sign(toCenter.x - fromCenter.x) * lineLength * Math.cos(angle),
      y: fromCenter.y + Math.sign(toCenter.y - fromCenter.y) * lineLength * Math.sin(angle)
    };

    return (
      <line
        className="drawn-symbol"
        x1={fromCenter.x}
        y1={fromCenter.y}
        x2={adjustedToCenter.x}
        y2={adjustedToCenter.y}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
        markerEnd="url(#arrow-marker)"
        style={transformStyle}
      />
    );
  }
}
