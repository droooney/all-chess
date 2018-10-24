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
  PieceTypeEnum,
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

  moveBack = () => {
    this.game!.moveBack();
  };

  moveForward = () => {
    this.game!.moveForward();
  };

  navigateToMove = (moveIndex: number) => {
    this.game!.navigateToMove(moveIndex);
  };

  sendMessage = (message: string) => {
    this.socket!.emit('addChatMessage', message);
  };

  getPocketPiece = (type: PieceTypeEnum, color: ColorEnum): PocketPiece | null => {
    return this.game!.getPocketPiece(type, color);
  };

  selectPiece = (selectedPiece: RealPiece | null) => {
    this.setState({
      selectedPiece
    });
  };

  offerDraw = () => {
    this.socket!.emit('offerDraw');
  };

  acceptDraw = () => {
    this.socket!.emit('drawAccepted');
  };

  cancelDraw = () => {
    this.socket!.emit('drawCanceled');
  };

  declineDraw = () => {
    this.socket!.emit('drawDeclined');
  };

  resign = () => {
    this.socket!.emit('resign');
  };

  declareThreefoldRepetitionDraw = () => {
    this.socket!.emit('declareThreefoldRepetitionDraw');
  };

  declare50MoveDraw = () => {
    this.socket!.emit('declare50MoveDraw');
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
          startingData,
          status,
          pieces,
          chat,
          turn,
          players,
          pocketPiecesUsed,
          isPocketUsed,
          isAliceChess,
          isChessence,
          isDarkChess,
          isThreefoldRepetitionDrawPossible,
          is50MoveDrawPossible,
          pliesPerMove,
          drawOffer,
          timeControl,
          result,
          variants,
          darkChessMode,
          showDarkChessHiddenPieces,
          currentMoveIndex
        } = this.game!;
        const {
          isBlackBase,
          selectedPiece
        } = this.state;
        const usedMoves = this.game!.getUsedMoves();
        const player = this.player;
        const isBoardAtTop = isAliceChess && !isChessence;

        content = (
          <div className={classNames('game', { 'top-boards-grid': isBoardAtTop })}>

            <InfoActionsPanel
              result={result}
              variants={variants}
              players={players}
              isThreefoldRepetitionDrawPossible={isThreefoldRepetitionDrawPossible}
              is50MoveDrawPossible={is50MoveDrawPossible}
              isAliceChess={isAliceChess}
              isDarkChess={isDarkChess}
              isBlackBase={isBlackBase}
              drawOffer={drawOffer}
              darkChessMode={darkChessMode}
              showDarkChessHiddenPieces={showDarkChessHiddenPieces}
              player={player}
              offerDraw={this.offerDraw}
              acceptDraw={this.acceptDraw}
              cancelDraw={this.cancelDraw}
              declineDraw={this.declineDraw}
              resign={this.resign}
              declareThreefoldRepetitionDraw={this.declareThreefoldRepetitionDraw}
              declare50MoveDraw={this.declare50MoveDraw}
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
                || currentMoveIndex + 1 !== usedMoves.length
              )}
              isBlackBase={isBlackBase}
              darkChessMode={darkChessMode}
              currentMove={usedMoves[currentMoveIndex]}
            />

            <RightPanel
              players={players}
              player={player}
              pieces={pieces}
              startingData={startingData}
              pocketPiecesUsed={pocketPiecesUsed}
              isPocketUsed={isPocketUsed}
              currentMoveIndex={currentMoveIndex}
              timeControl={timeControl}
              pliesPerMove={pliesPerMove}
              moves={usedMoves}
              isBlackBase={isBlackBase}
              status={status}
              timeDiff={this.timeDiff!}
              selectedPiece={
                selectedPiece && selectedPiece.location.type === PieceLocationEnum.POCKET
                  ? selectedPiece as PocketPiece
                  : null
              }
              getPocketPiece={this.getPocketPiece}
              selectPiece={this.selectPiece}
              moveBack={this.moveBack}
              moveForward={this.moveForward}
              navigateToMove={this.navigateToMove}
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
