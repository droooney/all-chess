import * as React from 'react';
import classNames from 'classnames';

import { AnyMove, ColorEnum } from 'shared/types';

import { Game } from 'client/helpers';

interface OwnProps {
  game: Game;
  move: AnyMove;
  moveIndex: number;
  isCurrent: boolean;
}

type Props = OwnProps;

class TextMove extends React.PureComponent<Props> {
  onClick = () => {
    const {
      game,
      moveIndex,
    } = this.props;

    game.navigateToMove(moveIndex);
  };

  render() {
    const {
      game,
      move,
      moveIndex,
      isCurrent,
    } = this.props;
    const startingMoveIndex = game.startingData.startingMoveIndex;
    const startingMove = Math.floor(startingMoveIndex / 2);
    const startingMoveOffset = startingMoveIndex % 2;
    const moveRelativeIndex = Math.floor((moveIndex + startingMoveOffset) / 2);
    const moveAbsoluteIndex = startingMove + moveRelativeIndex + 1;

    return (
      <div className="move-container">
        {(moveIndex === 0 || game.getMoveColor(moveIndex) === ColorEnum.WHITE) && (
          <span className="move-index">
            {moveAbsoluteIndex}{moveIndex === 0 && startingMoveOffset ? '...' : '.'}
          </span>
        )}

        <span className={classNames('move', { current: isCurrent })} onClick={this.onClick}>
          {move.notation}
        </span>
      </div>
    );
  }
}

export default TextMove;
