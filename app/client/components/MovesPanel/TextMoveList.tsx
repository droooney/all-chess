import * as React from 'react';

import { AnyMove } from 'shared/types';

import { Game } from 'client/helpers';

import TextMove from './TextMove';

interface OwnProps {
  game: Game;
  currentMoveIndex: number;
  moves: AnyMove[];
}

type Props = OwnProps;

class TextMoveList extends React.PureComponent<Props> {
  render() {
    const {
      game,
      currentMoveIndex,
      moves,
    } = this.props;

    return (
      <div className="moves-text">
        {moves.map((move, index) => (
          <TextMove
            key={index}
            game={game}
            move={move}
            moveIndex={index}
            isCurrent={currentMoveIndex === index}
          />
        ))}
      </div>
    );
  }
}

export default TextMoveList;
