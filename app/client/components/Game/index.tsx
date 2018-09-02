import * as React from 'react';

import {
  Game as IGame,
  Player,
  Square
} from '../../../types';
import Board from '../Board';

import './index.less';

interface OwnProps {
  game: IGame;
  player: Player | null;
}

interface State {
  selectedSquare: Square | null;
}

type Props = OwnProps;

export default class Game extends React.Component<Props, State> {
  state: State = {
    selectedSquare: null
  };

  render() {
    return (
      <div className="game">
        <Board
          board={this.props.game.board}
          player={this.props.player}
        />
      </div>
    );
  }
}
