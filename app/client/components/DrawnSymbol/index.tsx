import * as React from 'react';

import {
  CIRCULAR_CHESS_EMPTY_CENTER_RATIO,
  DRAWN_SYMBOL_COLORS,
  SVG_SQUARE_SIZE,
} from 'client/constants';

import { DrawnSymbol as IDrawnSymbol, DrawnSymbolType, Square } from 'shared/types';

import { Game } from 'client/helpers';

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
      boardsShiftX,
    } = this.props;

    return game.getSquareCenter({
      ...square,
      x: game.adjustFileX(square.x + boardsShiftX),
    });
  }

  render() {
    const {
      game,
      symbol,
    } = this.props;
    const style: React.CSSProperties = {
      transform: 'rotate(calc(180deg * var(--is-black-base, 0)))',
      transformOrigin: `${game.boardCenterX}px ${game.boardCenterY}px`,
      stroke: DRAWN_SYMBOL_COLORS[symbol.color],
    };

    if (symbol.type === DrawnSymbolType.CIRCLE) {
      const strokeWidth = SVG_SQUARE_SIZE / 20;
      const center = this.getSquareCenter(symbol.square);

      return (
        <circle
          className="drawn-symbol"
          r={(game.isCircularChess ? 1 - CIRCULAR_CHESS_EMPTY_CENTER_RATIO : 1) * SVG_SQUARE_SIZE / 2 - strokeWidth / 2}
          cx={center.x}
          cy={center.y}
          strokeWidth={strokeWidth}
          fill="none"
          style={style}
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
      y: fromCenter.y + Math.sign(toCenter.y - fromCenter.y) * lineLength * Math.sin(angle),
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
        markerEnd={`url(#arrow-marker-${symbol.color})`}
        style={style}
      />
    );
  }
}
