import * as React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import io = require('socket.io-client');

import {
  Game,
  GameStatusEnum,
  Player
} from '../../../types';
import GameComponent from '../Game';

import './index.less';

type Props = RouteComponentProps<{ roomId: string }>;

interface State {
  game: Game | null;
}

export default class Room extends React.Component<Props, State> {
  socket?: io.Socket;
  player: Player | null = null;
  timeDiff?: number;
  state: State = {
    game: null
  };

  componentDidMount() {
    const {
      match: {
        params: {
          roomId
        }
      }
    } = this.props;
    const socket = this.socket = io.connect(`/rooms/${roomId}`);

    socket.on('initialGameData', ({ timestamp, player, game }) => {
      console.log('gameData', player, game);

      this.player = player;
      this.timeDiff = Date.now() - timestamp;

      this.setState({
        game
      });
    });

    socket.on('startGame', (players) => {
      this.setState(({ game }) => ({
        game: game && {
          ...game,
          status: GameStatusEnum.ONGOING,
          players
        }
      }));
    });
  }

  componentWillUnmount() {
    this.socket!.disconnect();
  }

  render() {
    let content: JSX.Element | string;

    if (!this.state.game) {
      content = (
        <div className="spinner">
          Loading game...
        </div>
      );
    } else if (this.state.game.status === GameStatusEnum.BEFORE_START) {
      content = this.player
        ? 'Waiting for the opponent...'
        : 'Waiting for the players...';
    } else {
      content = (
        <GameComponent
          game={this.state.game}
          player={this.player}
          socket={this.socket!}
          timeDiff={this.timeDiff!}
        />
      );
    }

    return (
      <div className="route room-route">
        {content}
      </div>
    );
  }
}
