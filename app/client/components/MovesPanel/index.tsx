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
  movesRef = React.createRef<HTMLDivElement>();
  currentMoveRef = React.createRef<HTMLDivElement>();

  componentDidMount() {
    this.setupScroll();
  }

  componentDidUpdate(prevProps: Props) {
    const {
      currentMoveIndex,
    } = this.props;

    if (currentMoveIndex !== prevProps.currentMoveIndex) {
      this.setupScroll();
    }
  }

  setupScroll() {
    const movesElem = this.movesRef.current!;
    const currentMoveElem = this.currentMoveRef.current;

    if (currentMoveElem) {
      const newScrollTop = currentMoveElem.offsetTop - (movesElem.clientHeight - currentMoveElem.clientHeight) / 2;

      movesElem.scrollTop = Math.max(0, Math.min(newScrollTop, movesElem.scrollHeight - movesElem.clientHeight));
    } else {
      movesElem.scrollTop = 0;
    }
  }

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

        <div className="moves-container" ref={this.movesRef}>
          {type === 'byTurn' ? (
            <MoveListByTurn
              game={game}
              currentMoveIndex={currentMoveIndex}
              currentMoveRef={this.currentMoveRef}
              moves={moves}
            />
          ) : (
            <TextMoveList
              game={game}
              currentMoveIndex={currentMoveIndex}
              currentMoveRef={this.currentMoveRef}
              moves={moves}
            />
          )}
        </div>
      </div>
    );
  }
}
