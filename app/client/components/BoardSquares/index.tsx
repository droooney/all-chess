import * as _ from 'lodash';
import * as React from 'react';

import { Game } from 'client/helpers';
import { RealPieceLocation, Square } from 'shared/types';

import BoardSquare from '../BoardSquare';

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
        boardHeight
      },
      board,
      onSquareClick,
      onPieceDragStart
    } = this.props;
    const squares: JSX.Element[] = [];

    _.times(boardHeight, (rankY) => {
      _.times(boardWidth, (fileX) => {
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
          />
        );
      });
    });

    return squares;
  }
}
