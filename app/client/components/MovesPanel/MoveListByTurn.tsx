import * as React from 'react';
import chunk from 'lodash/chunk';

import { AnyMove } from 'shared/types';

import { Game } from 'client/helpers';

import MovesRow from './MovesRow';

import './index.less';

interface OwnProps {
  game: Game;
  currentMoveIndex: number;
  moves: AnyMove[];
}

type Props = OwnProps;

export default class MoveListByTurn extends React.Component<Props> {
  movesRef = React.createRef<HTMLDivElement>();
  currentMoveRef = React.createRef<HTMLDivElement>();

  componentDidMount() {
    const movesElem = this.movesRef.current!;

    movesElem.scrollTop = movesElem.scrollHeight - movesElem.clientHeight;
  }

  componentDidUpdate(prevProps: Props) {
    const {
      currentMoveIndex,
    } = this.props;

    if (currentMoveIndex !== prevProps.currentMoveIndex) {
      const movesElem = this.movesRef.current!;
      const currentMoveElem = this.currentMoveRef.current;

      if (currentMoveElem) {
        const moveRow = [...movesElem.children].indexOf(currentMoveElem.parentElement!);
        const moveHeight = currentMoveElem.clientHeight;
        const newScrollTop = moveRow * moveHeight - (movesElem.clientHeight - moveHeight) / 2;

        movesElem.scrollTop = Math.max(0, Math.min(newScrollTop, movesElem.scrollHeight - movesElem.clientHeight));
      } else {
        movesElem.scrollTop = 0;
      }
    }
  }

  render() {
    const {
      game,
      currentMoveIndex,
      moves,
    } = this.props;
    const startingMoveIndex = game.startingData.startingMoveIndex;
    const startingMoveOffset = startingMoveIndex % 2;
    const restMoves = chunk(moves.slice(startingMoveOffset), 2);

    return (
      <div className="moves-by-turn" ref={this.movesRef}>
        {(startingMoveOffset ? [
          moves.slice(0, startingMoveOffset),
          ...restMoves,
        ] : restMoves).map((moves, moveRow) => (
          <MovesRow
            key={moveRow}
            game={game}
            moveRow={moveRow}
            currentMoveIndex={currentMoveIndex}
            currentMoveRef={this.currentMoveRef}
            moves={moves}
          />
        ))}
      </div>
    );
  }
}
