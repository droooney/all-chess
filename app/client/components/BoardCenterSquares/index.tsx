import * as _ from 'lodash';
import * as React from 'react';

import { Game } from 'client/helpers';

import { SVG_SQUARE_SIZE } from '../../constants';
import { Square } from '../../../shared/types';

interface OwnProps {
  game: Game;
}

type Props = OwnProps;

export default class BoardSquares extends React.PureComponent<Props> {
  render() {
    const {
      game,
      game: {
        isHexagonalChess,
        boardWidth,
        boardHeight,
        boardCenterX,
        boardCenterY
      }
    } = this.props;
    const centerBorders: JSX.Element[] = [];

    _.times(boardHeight, (rankY) => {
      _.times(boardWidth, (fileX) => {
        const square: Square = { board: 0, x: fileX, y: rankY };
        const centerSquareParams = game.getCenterSquareParams(square);
        const hexPoints = game.getHexPoints(square);

        if (centerSquareParams) {
          const translateX = `calc(${SVG_SQUARE_SIZE}px * var(--rendered-file-${fileX}, ${fileX}))`;
          const translateY = `calc(${SVG_SQUARE_SIZE}px * ${boardHeight - 1 - rankY})`;
          const style: React.CSSProperties = {
            transform: [
              'rotate(calc(180deg * var(--is-black-base, 0)))',
              ...(
                isHexagonalChess
                  ? []
                  : [`translate(${translateX}, ${translateY})`]
              )
            ].join(' '),
            transformOrigin: `${boardCenterX}px ${boardCenterY}px`
          };

          if (centerSquareParams.top) {
            if (isHexagonalChess) {
              centerBorders.push(
                <g key={`${rankY}-${fileX}-top`} style={style}>
                  <path
                    className="center-border"
                    d={`
                      M ${hexPoints.left.x},${hexPoints.left.y}
                      L ${hexPoints.topLeft.x},${hexPoints.topLeft.y}
                      L ${hexPoints.topRight.x},${hexPoints.topRight.y}
                      L ${hexPoints.right.x},${hexPoints.right.y}
                    `}
                  />
                </g>
              );
            } else {
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
          }

          if (centerSquareParams.topLeft && isHexagonalChess) {
            centerBorders.push(
              <g key={`${rankY}-${fileX}-top-left`} style={style}>
                <path
                  className="center-border"
                  d={`
                    M ${hexPoints.bottomLeft.x},${hexPoints.bottomLeft.y}
                    L ${hexPoints.left.x},${hexPoints.left.y}
                    L ${hexPoints.topLeft.x},${hexPoints.topLeft.y}
                    L ${hexPoints.topRight.x},${hexPoints.topRight.y}
                  `}
                />
              </g>
            );
          }

          if (centerSquareParams.topRight && isHexagonalChess) {
            centerBorders.push(
              <g key={`${rankY}-${fileX}-top-right`} style={style}>
                <path
                  className="center-border"
                  d={`
                    M ${hexPoints.topLeft.x},${hexPoints.topLeft.y}
                    L ${hexPoints.topRight.x},${hexPoints.topRight.y}
                    L ${hexPoints.right.x},${hexPoints.right.y}
                    L ${hexPoints.bottomRight.x},${hexPoints.bottomRight.y}
                  `}
                />
              </g>
            );
          }

          if (centerSquareParams.bottom) {
            if (isHexagonalChess) {
              centerBorders.push(
                <g key={`${rankY}-${fileX}-bottom`} style={style}>
                  <path
                    className="center-border"
                    d={`
                      M ${hexPoints.left.x},${hexPoints.left.y}
                      L ${hexPoints.bottomLeft.x},${hexPoints.bottomLeft.y}
                      L ${hexPoints.bottomRight.x},${hexPoints.bottomRight.y}
                      L ${hexPoints.right.x},${hexPoints.right.y}
                    `}
                  />
                </g>
              );
            } else {
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
          }

          if (centerSquareParams.bottomLeft && isHexagonalChess) {
            centerBorders.push(
              <g key={`${rankY}-${fileX}-bottom-left`} style={style}>
                <path
                  className="center-border"
                  d={`
                    M ${hexPoints.bottomRight.x},${hexPoints.bottomRight.y}
                    L ${hexPoints.bottomLeft.x},${hexPoints.bottomLeft.y}
                    L ${hexPoints.left.x},${hexPoints.left.y}
                    L ${hexPoints.topLeft.x},${hexPoints.topLeft.y}
                  `}
                />
              </g>
            );
          }

          if (centerSquareParams.bottomRight && isHexagonalChess) {
            centerBorders.push(
              <g key={`${rankY}-${fileX}-bottom-right`} style={style}>
                <path
                  className="center-border"
                  d={`
                    M ${hexPoints.topRight.x},${hexPoints.topRight.y}
                    L ${hexPoints.right.x},${hexPoints.right.y}
                    L ${hexPoints.bottomRight.x},${hexPoints.bottomRight.y}
                    L ${hexPoints.bottomLeft.x},${hexPoints.bottomLeft.y}
                  `}
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
