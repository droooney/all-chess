import * as React from 'react';
import classNames from 'classnames';

import { AnyMove } from 'shared/types';

import { Game } from 'client/helpers';

import MoveListByTurn from './MoveListByTurn';
import TextMoveList from './TextMoveList';

import './index.less';

interface OwnProps {
  type: 'byTurn' | 'text';
  game: Game;
  currentMoveIndex: number;
  moves: AnyMove[];
}

type Props = OwnProps;

export default class MovesPanel extends React.Component<Props> {
  render() {
    const {
      type,
      game,
      currentMoveIndex,
      moves,
    } = this.props;
    const isBeforeFirstMove = currentMoveIndex === -1;
    const isAfterLastMove = currentMoveIndex === moves.length - 1;

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
        <div className="moves-container">
          {type === 'byTurn' ? (
            <MoveListByTurn
              game={game}
              currentMoveIndex={currentMoveIndex}
              moves={moves}
            />
          ) : (
            <TextMoveList
              game={game}
              currentMoveIndex={currentMoveIndex}
              moves={moves}
            />
          )}
        </div>
      </div>
    );
  }
}
