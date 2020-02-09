import * as _ from 'lodash';
import * as React from 'react';

import { Game } from '../../helpers';

import { SVG_SQUARE_SIZE } from '../../constants';

interface OwnProps {
  game: Game;
}

type Props = OwnProps;

export default class BoardSquares extends React.PureComponent<Props> {
  render() {
    const {
      game,
      game: {
        boardWidth,
        boardHeight
      }
    } = this.props;
    const centerBorders: JSX.Element[] = [];

    _.times(boardHeight, (rankY) => {
      _.times(boardWidth, (fileX) => {
        const centerSquareParams = game.getCenterSquareParams({ board: 0, x: fileX, y: rankY });

        if (centerSquareParams) {
          const translateX = `calc(${SVG_SQUARE_SIZE}px * var(--rendered-file-${fileX}, ${fileX}))`;
          const translateY = `calc(${SVG_SQUARE_SIZE}px * ${boardHeight - 1 - rankY})`;
          const style: React.CSSProperties = {
            transform: [
              'rotate(calc(180deg * var(--is-black-base, 0)))',
              ...(
                game.isCircularChess || game.isHexagonalChess
                  ? []
                  : [`translate(${translateX}, ${translateY})`]
              )
            ].join(' '),
            transformOrigin: `${game.boardCenterX}px ${game.boardCenterY}px`
          };

          if (centerSquareParams.top) {
            centerBorders.push(
              <g key={`${rankY}-${fileX}-top`} style={style}>
                <line
                  className="center-border"
                  x1={0}
                  y1={0}
                  x2={SVG_SQUARE_SIZE}
                  y2={0}
                />
              </g>
            );
          }

          if (centerSquareParams.bottom) {
            centerBorders.push(
              <g key={`${rankY}-${fileX}-bottom`} style={style}>
                <line
                  className="center-border"
                  x1={0}
                  y1={SVG_SQUARE_SIZE}
                  x2={SVG_SQUARE_SIZE}
                  y2={SVG_SQUARE_SIZE}
                />
              </g>
            );
          }

          if (centerSquareParams.left) {
            centerBorders.push(
              <g key={`${rankY}-${fileX}-left`} style={style}>
                <line
                  className="center-border"
                  x1={0}
                  y1={0}
                  x2={0}
                  y2={SVG_SQUARE_SIZE}
                />
              </g>
            );
          }

          if (centerSquareParams.right) {
            centerBorders.push(
              <g key={`${rankY}-${fileX}-right`} style={style}>
                <line
                  className="center-border"
                  x1={SVG_SQUARE_SIZE}
                  y1={0}
                  x2={SVG_SQUARE_SIZE}
                  y2={SVG_SQUARE_SIZE}
                />
              </g>
            );
          }
        }
      });
    });

    return centerBorders;
  }
}
