import * as React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import io = require('socket.io-client');
import classNames = require('classnames');

import {
  BaseMove,
  BoardPiece,
  CenterSquareParams,
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
  RealPiece,
  Square
} from '../../../types';
import { Game as GameHelper } from '../../helpers';

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

  sendMove = (move: BaseMove) => {
    this.socket!.emit('makeMove', move);
  };

  sendMessage = (message: string) => {
    this.socket!.emit('addChatMessage', message);
  };

  getAllowedMoves = (piece: RealPiece): Square[] => {
    return this.game!.getAllowedMoves(piece);
  };

  getVisibleSquares = (): Square[] => {
    return this.game!.getVisibleSquares(this.game!.darkChessMode!);
  };

  getCenterSquareParams = (square: Square): CenterSquareParams => {
    return this.game!.getCenterSquareParams(square);
  };

  getPrevBoard = (board: number): number => {
    return this.game!.getPrevBoard(board);
  };

  getBoardPiece = (square: Square): BoardPiece | null => {
    return this.game!.getBoardPiece(square);
  };

  getPocketPiece = (type: PieceTypeEnum, color: ColorEnum): PocketPiece | null => {
    return this.game!.getPocketPiece(type, color);
  };

  isAttackedByOpponentPiece = (square: Square, opponentColor: ColorEnum): boolean => {
    return this.game!.isAttackedByOpponentPiece(square, opponentColor);
  };

  isPawnPromotion = (move: BaseMove): boolean => {
    return this.game!.isPawnPromotion(move);
  };

  isVoidSquare = (square: Square): boolean => {
    return this.game!.isVoidSquare(square);
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

    if (!this.state.gameData) {
      content = (
        <div className="spinner">
          Loading game...
        </div>
      );
    } else if (this.state.gameData.status === GameStatusEnum.BEFORE_START) {
      content = this.player
        ? 'Waiting for the opponent...'
        : 'Waiting for the players...';
    } else {
      const {
        status,
        boardCount,
        boardWidth,
        boardHeight,
        pieces,
        chat,
        turn,
        players,
        pocketPiecesUsed,
        isPocketUsed,
        isKingOfTheHill,
        isAliceChess,
        isMonsterChess,
        isChessence,
        isDarkChess,
        isThreefoldRepetitionDrawPossible,
        is50MoveDrawPossible,
        isOngoingDarkChessGame,
        numberOfMovesBeforeStart,
        drawOffer,
        timeControl,
        moves,
        colorMoves,
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
      const usedMoves = darkChessMode && !showDarkChessHiddenPieces ? colorMoves[darkChessMode] : moves;
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
            isOngoingDarkChessGame={isOngoingDarkChessGame}
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
            pieces={pieces}
            boardCount={boardCount}
            boardWidth={boardWidth}
            boardHeight={boardHeight}
            player={player}
            selectedPiece={
              selectedPiece
                ? selectedPiece
                : null
            }
            selectPiece={this.selectPiece}
            getPrevBoard={this.getPrevBoard}
            getAllowedMoves={this.getAllowedMoves}
            getVisibleSquares={this.getVisibleSquares}
            getBoardPiece={this.getBoardPiece}
            isAttackedByOpponentPiece={this.isAttackedByOpponentPiece}
            isPawnPromotion={this.isPawnPromotion}
            isVoidSquare={this.isVoidSquare}
            getCenterSquareParams={this.getCenterSquareParams}
            sendMove={this.sendMove}
            readOnly={(
              !player
              || player.color !== turn
              || status !== GameStatusEnum.ONGOING
              || currentMoveIndex + 1 !== usedMoves.length
            )}
            withLiterals
            isKingOfTheHill={isKingOfTheHill}
            isAliceChess={isAliceChess}
            isDarkChess={isDarkChess}
            isBoardAtTop={isBoardAtTop}
            isChessence={isChessence}
            isBlackBase={isBlackBase}
            darkChessMode={darkChessMode}
            currentMove={usedMoves[currentMoveIndex]}
          />

          <RightPanel
            players={players}
            player={player}
            pieces={pieces}
            pocketPiecesUsed={pocketPiecesUsed}
            isPocketUsed={isPocketUsed}
            isMonsterChess={isMonsterChess}
            currentMoveIndex={currentMoveIndex}
            timeControl={timeControl}
            numberOfMovesBeforeStart={numberOfMovesBeforeStart}
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

    return (
      <div className="route game-route">
        {content}
      </div>
    );
  }
}
