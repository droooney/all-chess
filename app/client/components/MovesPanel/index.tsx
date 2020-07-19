import * as _ from 'lodash';
import * as React from 'react';
import classNames from 'classnames';

import {
  AnyMove
} from 'shared/types';
import { Game } from 'client/helpers';

import MovesRow from 'client/components/MovesRow';

import './index.less';

interface OwnProps {
  game: Game;
  currentMoveIndex: number;
  moves: AnyMove[];
}

type Props = OwnProps;

export default class MovesPanel extends React.Component<Props> {
  movesRef = React.createRef<HTMLDivElement>();
  currentMoveRef = React.createRef<HTMLDivElement>();

  componentDidMount() {
    const movesElem = this.movesRef.current!;

    movesElem.scrollTop = movesElem.scrollHeight - movesElem.clientHeight;
  }

  componentDidUpdate(prevProps: Props) {
    const {
      currentMoveIndex
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
      moves
    } = this.props;
    const isBeforeFirstMove = currentMoveIndex === -1;
    const isAfterLastMove = currentMoveIndex === moves.length - 1;
    const startingMoveIndex = game.startingData.startingMoveIndex;
    const startingMoveOffset = startingMoveIndex % 2;
    const restMoves = _.chunk(moves.slice(startingMoveOffset), 2);

    return (
      <div className="moves-panel">
        <div className="moves-icons">
          <div
            className={classNames('move-icon', { disabled: isBeforeFirstMove })}
            onClick={() => game.navigateToMove(-1)}
          >
            <i className="fa fa-fast-backward" />
          </div>
          <div
            className={classNames('move-icon', { disabled: isBeforeFirstMove })}
            onClick={() => game.moveBack()}
          >
            <i className="fa fa-backward" />
          </div>
          <div
            className={classNames('move-icon', { disabled: isAfterLastMove })}
            onClick={() => game.moveForward(true, true)}
          >
            <i className="fa fa-forward" />
          </div>
          <div
            className={classNames('move-icon', { disabled: isAfterLastMove })}
            onClick={() => game.navigateToMove(moves.length - 1)}
          >
            <i className="fa fa-fast-forward" />
          </div>
        </div>
        <div className="moves-container" ref={this.movesRef}>
          {(startingMoveOffset ? [
            moves.slice(0, startingMoveOffset),
            ...restMoves
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
      </div>
    );
  }
}
