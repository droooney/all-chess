import * as React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import io = require('socket.io-client');
import classNames = require('classnames');

import {
  ColorEnum,
  DarkChessGame,
  DarkChessGameInitialData,
  Game as IGame,
  GameInitialData,
  GameStatusEnum,
  PieceLocationEnum,
  Player,
  PocketPiece,
  RealPiece
} from '../../../types';
import {
  GAME_VARIANT_NAMES
} from '../../../shared/constants';
import { Game as GameHelper } from '../../helpers';

import DocumentTitle from '../DocumentTitle';
import RightPanel from '../RightPanel';
import InfoActionsPanel from '../InfoActionsPanel';
import Chat from '../Chat';
import Boards from '../Boards';

import './index.less';

type Props = RouteComponentProps<{ gameId: string }>;

interface State {
  gameData: IGame | DarkChessGame | null;
  selectedPiece: RealPiece | null;
  isBlackBase: boolean;
  showHiddenPieces: boolean;
}

export default class Game extends React.Component<Props, State> {
  socket?: io.Socket;
  player: Player | null = null;
  timeDiff?: number;
  game?: GameHelper;
  state: State = {
    selectedPiece: null,
    gameData: null,
    isBlackBase: false,
    showHiddenPieces: true
  };

  componentDidMount() {
    const {
      match: {
        params: {
          gameId
        }
      }
    } = this.props;
    const socket = this.socket = io.connect(`/games/${gameId}`);

    socket.on('initialGameData', this.onGameData);
    socket.on('initialDarkChessGameData', this.onGameData);

    socket.on('startGame', (players) => {
      this.game!.players = players;
      this.game!.status = GameStatusEnum.ONGOING;

      this.setState(({ gameData }) => ({
        gameData: gameData && {
          ...gameData,
          status: GameStatusEnum.ONGOING,
          players
        }
      }));
    });
  }

  componentWillUnmount() {
    this.socket!.disconnect();
  }

  getStartingIsBlackBase(): boolean {
    return !!this.player && this.player.color === ColorEnum.BLACK;
  }

  onGameData = ({ timestamp, player, game }: GameInitialData | DarkChessGameInitialData) => {
    this.player = player;
    this.timeDiff = Date.now() - timestamp;
    this.game = new GameHelper(game, this.socket!, player);

    this.game.on('updateChat', () => {
      this.forceUpdate();
    });

    this.game.on('updateGame', () => {
      this.forceUpdate();
    });

    this.setState({
      gameData: game,
      isBlackBase: this.getStartingIsBlackBase()
    });

    console.log(this.game);
  };

  sendMessage = (message: string) => {
    this.socket!.emit('addChatMessage', message);
  };

  selectPiece = (selectedPiece: RealPiece | null) => {
    this.setState({
      selectedPiece
    });
  };

  flipBoard = () => {
    this.setState(({ isBlackBase }) => ({
      isBlackBase: !isBlackBase
    }));
  };

  changeDarkChessMode = () => {
    const darkChessMode = this.game!.darkChessMode;

    this.setState({
      isBlackBase: darkChessMode
        ? darkChessMode === ColorEnum.WHITE
          ? true
          : this.getStartingIsBlackBase()
        : false
    });
    this.game!.changeDarkChessMode();
  };

  toggleShowDarkChessHiddenPieces = () => {
    this.game!.toggleShowDarkChessHiddenPieces();
  };

  render() {
    let content: JSX.Element | string;
    let title: string | null;

    if (this.state.gameData) {
      const {
        status,
        variants
      } = this.state.gameData;

      title = `AllChess - ${variants.length > 1 ? 'Mixed' : variants.length ? GAME_VARIANT_NAMES[variants[0]] : 'Standard'} Game`;

      if (status === GameStatusEnum.BEFORE_START) {
        content = this.player
          ? 'Waiting for the opponent...'
          : 'Waiting for the players...';
      } else {
        const {
          status,
          pieces,
          chat,
          turn,
          players,
          isAliceChess,
          isChessence,
          drawOffer,
          takebackRequest,
          timeControl,
          result,
          darkChessMode,
          showDarkChessHiddenPieces,
          lastMoveTimestamp,
          currentMoveIndex
        } = this.game!;
        const {
          isBlackBase,
          selectedPiece
        } = this.state;
        const usedMoves = this.game!.getUsedMoves();
        const player = this.player;
        const isBoardAtTop = isAliceChess && !isChessence;
        const isCurrentMoveLast = currentMoveIndex === usedMoves.length - 1;

        content = (
          <div className={classNames('game', { 'top-boards-grid': isBoardAtTop })}>

            <InfoActionsPanel
              game={this.game!}
              result={result}
              players={players}
              isBlackBase={isBlackBase}
              isNoMovesMade={usedMoves.length === 0}
              isCurrentMoveLast={isCurrentMoveLast}
              drawOffer={drawOffer}
              takebackRequest={takebackRequest}
              darkChessMode={darkChessMode}
              showDarkChessHiddenPieces={showDarkChessHiddenPieces}
              player={player}
              flipBoard={this.flipBoard}
              changeDarkChessMode={this.changeDarkChessMode}
              toggleShowDarkChessHiddenPieces={this.toggleShowDarkChessHiddenPieces}
            />

            <Chat
              chat={chat}
              sendMessage={this.sendMessage}
            />

            <Boards
              game={this.game!}
              pieces={pieces}
              player={player}
              selectedPiece={
                selectedPiece
                  ? selectedPiece
                  : null
              }
              selectPiece={this.selectPiece}
              readOnly={(
                !player
                || player.color !== turn
                || status !== GameStatusEnum.ONGOING
                || !isCurrentMoveLast
              )}
              isBlackBase={isBlackBase}
              darkChessMode={darkChessMode}
              currentMove={usedMoves[currentMoveIndex]}
            />

            <RightPanel
              game={this.game!}
              players={players}
              player={player}
              pieces={pieces}
              currentMoveIndex={currentMoveIndex}
              timeControl={timeControl}
              moves={usedMoves}
              isBlackBase={isBlackBase}
              status={status}
              timeDiff={this.timeDiff!}
              lastMoveTimestamp={lastMoveTimestamp}
              selectedPiece={
                selectedPiece && selectedPiece.location.type === PieceLocationEnum.POCKET
                  ? selectedPiece as PocketPiece
                  : null
              }
              selectPiece={this.selectPiece}
            />

          </div>
        );
      }
    } else {
      content = (
        <div className="spinner">
          Loading game...
        </div>
      );
      title = null;
    }

    return (
      <div className="route game-route">
        <DocumentTitle value={title} />
        {content}
      </div>
    );
  }
}
