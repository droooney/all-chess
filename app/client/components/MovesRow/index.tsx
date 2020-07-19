import * as React from 'react';
import classNames from 'classnames';

import {
  AnyMove
} from '../../../shared/types';
import { Game } from 'client/helpers';

interface OwnProps {
  game: Game;
  moveRow: number;
  currentMoveIndex: number;
  currentMoveRef: React.RefObject<HTMLDivElement>;
  moves: AnyMove[];
}

type Props = OwnProps;

export default class MovesRow extends React.Component<Props> {
  shouldComponentUpdate(nextProps: Props): boolean {
    if (this.props.moves.length !== nextProps.moves.length) {
      return true;
    }

    const containsCurrentMove = this.containsCurrentMove(this.props);

    return (
      containsCurrentMove !== this.containsCurrentMove(nextProps)
      || this.props.moves.some(({ algebraic }, index) => nextProps.moves[index].algebraic !== algebraic)
      || (containsCurrentMove && this.props.currentMoveIndex !== nextProps.currentMoveIndex)
    );
  }

  containsCurrentMove(props: Props) {
    const {
      game,
      moveRow,
      currentMoveIndex,
      moves
    } = props;
    const startingMoveIndex = game.startingData.startingMoveIndex;
    const startingMoveOffset = startingMoveIndex % 2;
    const startMoveRowIndex = moveRow * 2 - (moveRow === 0 ? 0 : startingMoveOffset);

    return (
      currentMoveIndex >= startMoveRowIndex
      && currentMoveIndex < startMoveRowIndex + moves.length
    );
  }

  render() {
    const {
      game,
      moveRow,
      currentMoveIndex,
      currentMoveRef,
      moves
    } = this.props;
    const startingMoveIndex = game.startingData.startingMoveIndex;
    const startingMove = Math.floor(startingMoveIndex / 2);
    const startingMoveOffset = startingMoveIndex % 2;
    const firstMoveLeftOffset = 44 * startingMoveOffset;

    return (
      <div key={moveRow} className="move-row">
        <div className="move-index">{startingMove + moveRow + 1}</div>
        {moves.map((move, turn) => {
          const moveIndex = moveRow * 2 + turn - (moveRow === 0 ? 0 : startingMoveOffset);
          const isCurrent = moveIndex === currentMoveIndex;

          return (
            <div
              key={turn}
              ref={isCurrent ? currentMoveRef : undefined}
              className={classNames('move', {
                current: isCurrent
              })}
              style={!moveRow && !turn && startingMoveIndex ? {
                position: 'relative',
                left: `${firstMoveLeftOffset}%`
              } : {}}
              onClick={() => game.navigateToMove(moveIndex)}
            >
              {move.figurine}
            </div>
          );
        })}
      </div>
    );
  }
}
