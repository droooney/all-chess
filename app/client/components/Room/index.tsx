import * as React from 'react';
import { RouteComponentProps } from 'react-router-dom';

import {
  Game,
  GameStatusEnum,
  Player
} from '../../../types';
import GameComponent from '../Game';

import './index.less';
import io = require('socket.io-client');

type Props = RouteComponentProps<{ roomId: string }>;

interface State {
  game: Game | null;
}

export default class Room extends React.Component<Props, State> {
  socket?: io.Socket;
  player: Player | null = null;
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

    socket.on('initialGameData', ({ player, game }) => {
      console.log('gameData', player, game);

      this.player = player;

      this.setState({
        game
      });
    });

    socket.on('updateGame', (game) => {
      this.setState((state) => ({
        game: state.game
          ? game
          : null
      }));
    });

    socket.on('gameOver', ({ winner }) => {
      console.log(winner);
    });

    socket.on('newChatMessage', (chatMessage) => {
      this.setState(({ game }) => ({
        game: game && ({
          ...game,
          chat: [
            ...game.chat,
            chatMessage
          ]
        })
      }));
    });

    socket.on('gameOver', (result) => {
      this.setState(({ game }) => ({
        game: game && ({
          ...game,
          status: GameStatusEnum.FINISHED,
          result
        })
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
        : 'Waiting for the other player...';
    } else {
      content = (
        <GameComponent
          game={this.state.game}
          player={this.player}
          socket={this.socket!}
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
