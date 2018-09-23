import * as React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import io = require('socket.io-client');

import {
  BaseMove,
  CenterSquareParams,
  ColorEnum,
  Game as IGame,
  GameStatusEnum,
  PieceLocationEnum,
  Player,
  PocketPiece,
  RealPiece,
  RealPieceLocation,
  Square
} from '../../../types';
import { Game as GameHelper } from '../../helpers';

import LeftPanel from '../LeftPanel';
import RightPanel from '../RightPanel';

import './index.less';

type Props = RouteComponentProps<{ gameId: string }>;

interface State {
  gameData: IGame | null;
  selectedPiece: RealPiece | null;
}

export default class Game extends React.Component<Props, State> {
  socket?: io.Socket;
  player: Player | null = null;
  timeDiff?: number;
  game?: GameHelper;
  state: State = {
    selectedPiece: null,
    gameData: null
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

    socket.on('initialGameData', ({ timestamp, player, game }) => {
      this.player = player;
      this.timeDiff = Date.now() - timestamp;
      this.game = new GameHelper(game, socket);

      this.game.on('updateChat', () => {
        this.forceUpdate();
      });

      this.game.on('updateGame', () => {
        this.forceUpdate();
      });

      this.setState({
        gameData: game
      });

      console.log(this.game);
    });

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

  getAllowedMoves = (location: RealPieceLocation): Square[] => {
    return this.game!.getAllowedMoves(location);
  };

  getCenterSquareParams = (square: Square): CenterSquareParams => {
    return this.game!.getCenterSquareParams(square);
  };

  getPrevBoard = (board: number): number => {
    return this.game!.getPrevBoard(board);
  };

  getOppositeColor = (color: ColorEnum): ColorEnum => {
    return this.game!.getOppositeColor(color);
  };

  isAttackedByOpponentPiece = (square: Square, opponentColor: ColorEnum): boolean => {
    return this.game!.isAttackedByOpponentPiece(square, opponentColor);
  };

  isPawnPromotion = (move: BaseMove): boolean => {
    return this.game!.isPawnPromotion(move);
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
        boards,
        pieces,
        chat,
        turn,
        players,
        pocket,
        isPocketUsed,
        isKingOfTheHill,
        isAliceChess,
        isMonsterChess,
        isThreefoldRepetitionDrawPossible,
        is50MoveDrawPossible,
        numberOfMovesBeforeStart,
        drawOffer,
        timeControl,
        moves,
        result,
        variants,
        currentMoveIndex
      } = this.game!;
      const {
        selectedPiece
      } = this.state;
      const player = this.player;
      const isBlackBase = !!player && player.color === ColorEnum.BLACK;

      content = (
        <div className="game">

          <LeftPanel
            boards={boards}
            pieces={pieces}
            selectedPiece={
              selectedPiece
                ? selectedPiece
                : null
            }
            sendMove={this.sendMove}
            getAllowedMoves={this.getAllowedMoves}
            getCenterSquareParams={this.getCenterSquareParams}
            getOppositeColor={this.getOppositeColor}
            getPrevBoard={this.getPrevBoard}
            isAttackedByOpponentPiece={this.isAttackedByOpponentPiece}
            isPawnPromotion={this.isPawnPromotion}
            selectPiece={this.selectPiece}
            sendMessage={this.sendMessage}
            offerDraw={this.offerDraw}
            acceptDraw={this.acceptDraw}
            cancelDraw={this.cancelDraw}
            declineDraw={this.declineDraw}
            resign={this.resign}
            declareThreefoldRepetitionDraw={this.declareThreefoldRepetitionDraw}
            declare50MoveDraw={this.declare50MoveDraw}
            isBlackBase={isBlackBase}
            isKingOfTheHill={isKingOfTheHill}
            readOnly={(
              !player
              || player.color !== turn
              || status !== GameStatusEnum.ONGOING
              || currentMoveIndex + 1 !== moves.length
            )}
            currentMove={moves[currentMoveIndex]}
            chat={chat}
            result={result}
            variants={variants}
            players={players}
            isThreefoldRepetitionDrawPossible={isThreefoldRepetitionDrawPossible}
            is50MoveDrawPossible={is50MoveDrawPossible}
            isAliceChess={isAliceChess}
            drawOffer={drawOffer}
            player={player}
            withLiterals
          />

          <RightPanel
            players={players}
            player={player}
            pocket={pocket}
            isPocketUsed={isPocketUsed}
            isMonsterChess={isMonsterChess}
            currentMoveIndex={currentMoveIndex}
            timeControl={timeControl}
            numberOfMovesBeforeStart={numberOfMovesBeforeStart}
            moves={moves}
            isBlackBase={isBlackBase}
            status={status}
            timeDiff={this.timeDiff!}
            selectedPiece={
              selectedPiece && selectedPiece.location.type === PieceLocationEnum.POCKET
                ? selectedPiece as PocketPiece
                : null
            }
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
