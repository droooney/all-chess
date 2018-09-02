import * as _ from 'lodash';
import * as React from 'react';

import {
  Board as IBoard,
  ColorEnum,
  Player
} from '../../../types';
import Piece from '../Piece';

interface OwnProps {
  board: IBoard;
  player: Player | null;
}

type Props = OwnProps;

export default class Board extends React.Component<Props> {
  render() {
    const {
      board,
      player
    } = this.props;
    const isBlack = !!player && player.color === ColorEnum.BLACK;
    const ranks = _.map(board, (rank, rankY) => {
      const squares = _.map(rank, (piece, fileX) => (
        <div key={fileX} className={`square ${(+rankY + +fileX) % 2 ? 'white' : 'black'}`}>
          {piece ? <Piece piece={piece} /> : null}
        </div>
      ));

      if (isBlack) {
        squares.reverse();
      }

      return (
        <div key={rankY} className="rank">
          {squares}
        </div>
      );
    });

    if (isBlack) {
      ranks.reverse();
    }

    return (
      <div className="board">
        {ranks}
      </div>
    );
  }
}
