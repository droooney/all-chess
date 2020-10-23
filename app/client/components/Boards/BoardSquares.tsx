import times from 'lodash/times';
import * as React from 'react';

import { RealPieceLocation, Square } from 'shared/types';

import { Game } from 'client/helpers';

import BoardSquare from './BoardSquare';

interface OwnProps {
  game: Game;
  board: number;
  onSquareClick(square: Square): void;
  onPieceDragStart(e: React.MouseEvent | React.TouchEvent, location: RealPieceLocation): void;
}

type Props = OwnProps;

export default class BoardSquares extends React.PureComponent<Props> {
  render() {
    const {
      game,
      game: {
        boardWidth,
        boardHeight,
      },
      board,
      onSquareClick,
      onPieceDragStart,
    } = this.props;
    const squares: JSX.Element[] = [];

    times(boardHeight, (rankY) => {
      times(boardWidth, (fileX) => {
        const square: Square = { board, x: fileX, y: rankY };

        if (game.isEmptySquare(square)) {
          return;
        }

        squares.push(
          <BoardSquare
            key={`${rankY}-${fileX}`}
            className={`square ${game.getSquareColor(square)}`}
            game={game}
            board={board}
            fileX={fileX}
            rankY={rankY}
            onSquareClick={onSquareClick}
            onPieceDragStart={onPieceDragStart}
          />,
        );
      });
    });

    return squares;
  }
}
