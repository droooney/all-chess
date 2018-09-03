import * as React from 'react';
import { Socket } from 'socket.io-client';

import {
  Game as IGame,
  Player
} from '../../../types';
import Board from '../Board';

import './index.less';

interface OwnProps {
  game: IGame;
  player: Player | null;
  socket: Socket;
}

type Props = OwnProps;

export default class Game extends React.Component<Props> {
  render() {
    return (
      <div className="game">
        <Board
          board={this.props.game.board}
          player={this.props.player}
          turn={this.props.game.turn}
          socket={this.props.socket}
          isCheck={this.props.game.isCheck}
        />
      </div>
    );
  }
}
