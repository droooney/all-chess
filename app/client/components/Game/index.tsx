import * as React from 'react';
import { Socket } from 'socket.io-client';

import {
  ColorEnum,
  Game as IGame,
  GameStatusEnum,
  Move,
  Player,
  Square
} from '../../../types';
import { Game as GameHelper } from '../../helpers';

import Board from '../Board';
import Chat from '../Chat';
import RightPanel from '../RightPanel';

import './index.less';

interface OwnProps {
  game: IGame;
  player: Player | null;
  socket: Socket;
  timeDiff: number;
}

type Props = OwnProps;

export default class Game extends React.Component<Props> {
  game: GameHelper;

  constructor(props: Props) {
    super(props);

    const game = this.game = new GameHelper(props.game, props.socket);

    game.on('updateChat', () => {
      this.forceUpdate();
    });

    game.on('updateGame', () => {
      this.forceUpdate();
    });
  }

  moveBack = () => {
    this.game.moveBack();
  };

  moveForward = () => {
    this.game.moveForward();
  };

  navigateToMove = (moveIndex: number) => {
    this.game.navigateToMove(moveIndex);
  };

  sendMove = (move: Move) => {
    this.props.socket.emit('move', move);
  };

  sendMessage = (message: string) => {
    this.props.socket.emit('addChatMessage', message);
  };

  getAllowedMoves = (square: Square): Square[] => {
    return this.game.getAllowedMoves(square);
  };

  render() {
    const {
      status,
      board,
      pieces,
      chat,
      turn,
      players,
      timeControl,
      moves,
      currentMoveIndex,
      isCheck
    } = this.game;
    const {
      timeDiff,
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
          pieces={pieces}
          player={player}
          turn={turn}
          sendMove={this.sendMove}
          getAllowedMoves={this.getAllowedMoves}
          isCheck={isCheck}
          isBlackBase={isBlackBase}
          readOnly={(
            !player
            || player.color !== turn
            || status !== GameStatusEnum.ONGOING
            || currentMoveIndex + 1 !== moves.length
          )}
          currentMove={moves[currentMoveIndex]}
        />

        <RightPanel
          players={players}
          currentMoveIndex={currentMoveIndex}
          timeControl={timeControl}
          moves={moves}
          isBlackBase={isBlackBase}
          status={status}
          timeDiff={timeDiff}
          moveBack={this.moveBack}
          moveForward={this.moveForward}
          navigateToMove={this.navigateToMove}
        />

      </div>
    );
  }
}
