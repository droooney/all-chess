import * as React from 'react';
import { Socket } from 'socket.io-client';

import {
  ColorEnum,
  Game as IGame,
  Move,
  Player
} from '../../../types';

import Board from '../Board';
import Chat from '../Chat';
import RightPanel from '../RightPanel';

import './index.less';

interface OwnProps {
  game: IGame;
  player: Player | null;
  socket: Socket;
}

type Props = OwnProps;

export default class Game extends React.Component<Props> {
  sendMove = (move: Move) => {
    this.props.socket.emit('move', move);
  };

  sendMessage = (message: string) => {
    this.props.socket.emit('addChatMessage', message);
  };

  render() {
    const {
      game: {
        status,
        board,
        chat,
        turn,
        players,
        lastMoveTimestamp,
        timeControl,
        moves,
        isCheck
      },
      player
    } = this.props;
    const isBlackBase = !!player && player.color === ColorEnum.BLACK;

    return (
      <div className="game">

        <Chat
          chat={chat}
          sendMessage={this.sendMessage}
        />

        <Board
          board={board}
          player={player}
          turn={turn}
          sendMove={this.sendMove}
          isCheck={isCheck}
          isBlackBase={isBlackBase}
        />

        <RightPanel
          players={players}
          lastMoveTimestamp={lastMoveTimestamp}
          timeControl={timeControl}
          moves={moves}
          turn={turn}
          isBlackBase={isBlackBase}
          status={status}
        />

      </div>
    );
  }
}
