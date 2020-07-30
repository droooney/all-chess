import * as React from 'react';
import times from 'lodash/times';

import { CIRCULAR_CHESS_EMPTY_CENTER_RATIO, SVG_SQUARE_SIZE } from 'client/constants';

import { Game } from 'client/helpers';

interface OwnProps {
  game: Game;
  board: number;
  boardsShiftX: number;
  isBlackBase: boolean;
}

type Props = OwnProps;

export default class BoardLiterals extends React.PureComponent<Props> {
  render() {
    const {
      game,
      game: {
        isCircularChess,
        isHexagonalChess,
        boardWidth,
        boardHeight,
        boardOrthodoxHeight,
        boardCenterX,
        boardCenterY,
        middleFileX,
        middleRankY,
      },
      board,
      boardsShiftX,
      isBlackBase,
    } = this.props;
    const rOuter = boardWidth * SVG_SQUARE_SIZE;
    const rDiff = (1 - CIRCULAR_CHESS_EMPTY_CENTER_RATIO) * SVG_SQUARE_SIZE;
    const literalFontSize = Math.ceil((
      isCircularChess
        ? (1 - CIRCULAR_CHESS_EMPTY_CENTER_RATIO / 2) * SVG_SQUARE_SIZE
        : SVG_SQUARE_SIZE
    ) * 0.25);
    const literalMargin = literalFontSize / 3;
    const literals: JSX.Element[] = [];

    times(boardHeight, (rankY) => {
      times(boardWidth, (fileX) => {
        const renderedFileX = game.adjustFileX(fileX + boardsShiftX);
        const square = {
          board,
          x: fileX,
          y: rankY,
        };
        const translateX = SVG_SQUARE_SIZE * (
          isBlackBase
            ? boardWidth - 1 - renderedFileX
            : renderedFileX
        );
        const translateY = SVG_SQUARE_SIZE * (
          isBlackBase
            ? rankY
            : boardHeight - 1 - rankY
        );
        const baseParams = {
          'data-square': JSON.stringify(square),
          transform: isCircularChess || isHexagonalChess
            ? undefined
            : `translate(${translateX}, ${translateY})`,
        };

        if (
          rankY === (
            isBlackBase && !isHexagonalChess
              ? isCircularChess
                ? boardOrthodoxHeight
                : boardHeight - 1
              : 0
          )
        ) {
          const fileLiteral = Game.getFileLiteral(fileX);
          let transform = baseParams.transform;

          if (isCircularChess) {
            const r = rOuter - (fileX + 1) * rDiff;

            transform = `translate(${boardCenterX},${boardCenterY + r})`;
          } else if (isHexagonalChess) {
            const fileAdjustmentX = fileX * 3 + 0.25;
            const translateX = (
              isBlackBase
                ? boardWidth * 3 - fileAdjustmentX
                : fileAdjustmentX + 1
            ) * SVG_SQUARE_SIZE / 2 / Math.sqrt(3);
            const rankAdjustmentY = 1 / 2 * Math.abs(fileX - middleFileX) + 0.17;
            const translateY = (
              isBlackBase
                ? rankAdjustmentY
                : boardHeight - rankAdjustmentY
            ) * SVG_SQUARE_SIZE;

            transform = `translate(${translateX},${translateY})`;
          }

          literals.push(
            <g {...baseParams} key={`${rankY}-${fileX}-file`} transform={transform}>
              <text
                className={`literal file-literal ${game.getLiteralColor(square)}`}
                transform={
                  isCircularChess
                    ? `translate(${-literalMargin - literalFontSize / 2 * (fileLiteral.length)},${literalFontSize * 1.05})`
                    : isHexagonalChess
                      ? undefined
                      : `translate(${literalMargin}, ${SVG_SQUARE_SIZE - literalMargin})`
                }
                fontSize={literalFontSize}
                alignmentBaseline={isHexagonalChess ? 'middle' : undefined}
                textAnchor={isHexagonalChess ? 'middle' : undefined}
              >
                {fileLiteral}
              </text>
            </g>,
          );
        }

        if (
          renderedFileX === (
            (isBlackBase && !isHexagonalChess) || isCircularChess
              ? 0
              : isHexagonalChess && rankY > middleRankY
                ? boardWidth - 1 - (rankY - middleRankY)
                : boardWidth - 1
          )
        ) {
          const rankLiteral = Game.getRankLiteral(rankY);
          let transform = baseParams.transform;

          if (isCircularChess) {
            const angleDiff = 2 * Math.PI / boardHeight;
            const angle = (rankY + 1) * angleDiff + (isBlackBase ? Math.PI : 0) - Math.PI / 80;
            const r = rOuter - rDiff * 0.25;
            const translateX = boardCenterX - r * Math.sin(angle);
            const translateY = boardCenterY + r * Math.cos(angle);

            transform = `translate(${translateX},${translateY})`;
          } else if (isHexagonalChess) {
            const fileAdjustmentX = fileX * 3 + 1.85 - (isBlackBase ? 0.1 : rankLiteral.length * 0.1);
            const translateX = (
              isBlackBase
                ? boardWidth * 3 - fileAdjustmentX
                : fileAdjustmentX + 1
            ) * SVG_SQUARE_SIZE / 2 / Math.sqrt(3);
            const rankAdjustmentY = rankY + 1 + 1 / 2 * Math.abs(fileX - middleFileX) - 0.2;
            const translateY = (
              isBlackBase
                ? rankAdjustmentY + 0.05
                : boardHeight - rankAdjustmentY + 0.05
            ) * SVG_SQUARE_SIZE;

            transform = `translate(${translateX},${translateY})`;
          }

          literals.push(
            <g {...baseParams} key={`${rankY}-${fileX}-rank`} transform={transform}>
              <text
                className={`literal rank-literal ${game.getLiteralColor(square)}`}
                transform={
                  isCircularChess || isHexagonalChess
                    ? undefined
                    : `translate(${SVG_SQUARE_SIZE - literalMargin - literalFontSize / 2 * (rankLiteral.length)}, ${literalFontSize * 1.12})`
                }
                fontSize={literalFontSize}
                alignmentBaseline={isCircularChess || isHexagonalChess ? 'middle' : undefined}
                textAnchor={isCircularChess || isHexagonalChess ? 'middle' : undefined}
              >
                {rankLiteral}
              </text>
            </g>,
          );
        }
      });
    });

    return literals;
  }
}
