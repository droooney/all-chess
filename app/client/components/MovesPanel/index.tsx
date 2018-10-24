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

  componentDidMount() {
    const movesElem = this.movesRef.current!;

    movesElem.scrollTop = movesElem.scrollHeight - movesElem.clientHeight;
  }

  componentDidUpdate(prevProps: Props) {
    const {
      moves
    } = this.props;

    if (moves.length > prevProps.moves.length) {
      const movesElem = this.movesRef.current!;
      const lastMoveRow = _.last(movesElem.children)!;
      const maxScroll = movesElem.scrollHeight - movesElem.clientHeight;

      if (maxScroll - movesElem.scrollTop - 10 <= lastMoveRow.clientHeight) {
        movesElem.scrollTop = maxScroll;
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

                return (
                  <div
                    key={turn}
                    className={classNames('move', {
                      current: moveIndex === currentMoveIndex
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
