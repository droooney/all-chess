import * as _ from 'lodash';
import * as React from 'react';
import classNames = require('classnames');

import {
  AnyMove,
  StartingData
} from '../../../types';

import './index.less';

interface OwnProps {
  currentMoveIndex: number;
  pliesPerMove: number;
  startingData: StartingData;
  moves: AnyMove[];
  moveBack(): void;
  moveForward(): void;
  navigateToMove(moveIndex: number): void;
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
      currentMoveIndex,
      pliesPerMove,
      startingData,
      moves,
      moveBack,
      moveForward,
      navigateToMove
    } = this.props;
    const isBeforeFirstMove = currentMoveIndex === -1;
    const isAfterLastMove = currentMoveIndex === moves.length - 1;
    const startingMoveIndex = startingData.startingMoveIndex;
    const startingMove = Math.floor(startingMoveIndex / pliesPerMove);
    const startingMoveOffset = startingMoveIndex % pliesPerMove;
    const firstMoveLeftOffset = 90 / pliesPerMove * startingMoveOffset;
    const restMoves = _.chunk(moves.slice(startingMoveOffset), pliesPerMove);

    return (
      <div className="moves-panel">
        <div className="moves-icons">
          <div
            className={classNames('move-icon', { disabled: isBeforeFirstMove })}
            onClick={() => navigateToMove(-1)}
          >
            <i className="fa fa-fast-backward" />
          </div>
          <div
            className={classNames('move-icon', { disabled: isBeforeFirstMove })}
            onClick={moveBack}
          >
            <i className="fa fa-backward" />
          </div>
          <div
            className={classNames('move-icon', { disabled: isAfterLastMove })}
            onClick={moveForward}
          >
            <i className="fa fa-forward" />
          </div>
          <div
            className={classNames('move-icon', { disabled: isAfterLastMove })}
            onClick={() => navigateToMove(moves.length - 1)}
          >
            <i className="fa fa-fast-forward" />
          </div>
        </div>
        <div className="moves-container" ref={this.movesRef}>
          {(startingMoveOffset ? [
            ...[moves.slice(0, startingMoveOffset)],
            ...restMoves
          ] : restMoves).map((moves, moveRow) => (
            <div key={moveRow} className={`move-row moves-${pliesPerMove}`}>
              <div className="move-index">{startingMove + moveRow + 1}</div>
              {moves.map((move, turn) => {
                const moveIndex = moveRow * pliesPerMove + turn - (startingMoveOffset && moveRow ? startingMoveOffset : 0);
                const isCurrent = moveIndex === currentMoveIndex;

                return (
                  <div
                    key={turn}
                    ref={isCurrent ? this.currentMoveRef : undefined}
                    className={classNames('move', {
                      current: isCurrent
                    })}
                    style={!moveRow && !turn && startingMoveIndex ? {
                      position: 'relative',
                      left: `${firstMoveLeftOffset}%`
                    } : {}}
                    onClick={() => navigateToMove(moveIndex)}
                  >
                    {move.figurine}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }
}
