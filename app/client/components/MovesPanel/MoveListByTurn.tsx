import * as React from 'react';
import chunk from 'lodash/chunk';

import { AnyMove } from 'shared/types';

import { Game } from 'client/helpers';

import MovesRow from './MovesRow';

import './index.less';

interface OwnProps {
  game: Game;
  currentMoveIndex: number;
  currentMoveRef: React.RefObject<HTMLDivElement>;
  moves: AnyMove[];
}

type Props = OwnProps;

export default class MoveListByTurn extends React.Component<Props> {
  render() {
    const {
      game,
      currentMoveIndex,
      currentMoveRef,
      moves,
    } = this.props;
    const startingMoveIndex = game.startingData.startingMoveIndex;
    const startingMoveOffset = startingMoveIndex % 2;
    const restMoves = chunk(moves.slice(startingMoveOffset), 2);

    return (
      <div className="moves-by-turn">
        {(startingMoveOffset ? [
          moves.slice(0, startingMoveOffset),
          ...restMoves,
        ] : restMoves).map((moves, moveRow) => (
          <MovesRow
            key={moveRow}
            game={game}
            moveRow={moveRow}
            currentMoveIndex={currentMoveIndex}
            currentMoveRef={currentMoveRef}
            moves={moves}
          />
        ))}
      </div>
    );
  }
}
