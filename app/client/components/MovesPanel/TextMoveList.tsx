import * as React from 'react';

import { AnyMove } from 'shared/types';

import { Game } from 'client/helpers';

import TextMove from './TextMove';

interface OwnProps {
  game: Game;
  currentMoveIndex: number;
  currentMoveRef: React.RefObject<HTMLDivElement>;
  moves: AnyMove[];
}

type Props = OwnProps;

class TextMoveList extends React.PureComponent<Props> {
  render() {
    const {
      game,
      currentMoveIndex,
      currentMoveRef,
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
            currentMoveRef={currentMoveRef}
          />
        ))}
      </div>
    );
  }
}

export default TextMoveList;
