import * as _ from 'lodash';
import * as React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import io = require('socket.io-client');
import classNames = require('classnames');

import {
  BaseMove,
  BoardPossibleMove,
  ColorEnum,
  DarkChessGame,
  DarkChessGameInitialData,
  Game as IGame,
  GameInitialData,
  GameStatusEnum,
  PieceLocationEnum,
  PiecePocketLocation,
  Player,
  PocketPiece,
  RealPiece,
  RealPieceLocation, Square
} from '../../../types';
import {
  GAME_VARIANT_NAMES
} from '../../../shared/constants';
import { Game as GameHelper } from '../../helpers';

import DocumentTitle from '../DocumentTitle';
import FixedElement from '../FixedElement';
import RightPanel from '../RightPanel';
import InfoActionsPanel from '../InfoActionsPanel';
import Chat from '../Chat';
import Boards from '../Boards';
import GamePiece from '../GamePiece';
import Piece from '../Piece';
import Modal from '../Modal';

import './index.less';

type Props = RouteComponentProps<{ gameId: string }>;

interface State {
  gameData: IGame | DarkChessGame | null;
  selectedPiece: RealPiece | null;
  isBlackBase: boolean;
  showHiddenPieces: boolean;
  boardsShiftX: number;
  promotionModalVisible: boolean;
  promotionMove: BaseMove | null;
  isDragging: boolean;
  squareSize: number;
}

export default class Game extends React.Component<Props, State> {
  socket?: io.Socket;
  player: Player | null = null;
  game?: GameHelper;
  draggingPieceRef = React.createRef<SVGSVGElement>();
  dragX = 0;
  dragY = 0;
  prevMoveIndex = -1;
  state: State = {
    selectedPiece: null,
    gameData: null,
    isBlackBase: false,
    showHiddenPieces: true,
    boardsShiftX: 0,
    promotionModalVisible: false,
    promotionMove: null,
    isDragging: false,
    squareSize: 0
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

    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  componentWillUnmount() {
    this.socket!.disconnect();

    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  }

  componentDidUpdate(_prevProps: Props, prevState: State): void {
    if (!prevState.isDragging && this.state.isDragging) {
      document.body.classList.add('dragging');
    } else if (prevState.isDragging && !this.state.isDragging) {
      document.body.classList.remove('dragging');
    }

    if (this.game) {
      if (this.prevMoveIndex !== this.game.currentMoveIndex) {
        this.selectPiece(null);
        this.setState({
          isDragging: false
        });
      }

      this.prevMoveIndex = this.game.currentMoveIndex;
    }
  }

  getStartingIsBlackBase(): boolean {
    return !!this.player && this.player.color === ColorEnum.BLACK;
  }

  onGameData = ({ timestamp, player, game }: GameInitialData | DarkChessGameInitialData) => {
    this.player = player;
    this.game = new GameHelper({
      game,
      socket: this.socket,
      player,
      currentMoveIndex: this.game && this.game.currentMoveIndex,
      timestamp
    });

    this.game.on('updateChat', () => {
      this.forceUpdate();
    });

    this.game.on('updateGame', () => {
      this.forceUpdate();
    });

    this.setState({
      gameData: game,
      squareSize: this.game.getSquareSize(),
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
    this.setState(({ isBlackBase, boardsShiftX }) => ({
      isBlackBase: !isBlackBase,
      boardsShiftX: -boardsShiftX
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

  setBoardsShiftX = (boardsShiftX: number) => {
    this.setState({
      boardsShiftX: this.game!.adjustFileX(boardsShiftX)
    });
  };

  getAllowedMoves = (): BoardPossibleMove[] => {
    const {
      selectedPiece
    } = this.state;

    if (!selectedPiece) {
      return [];
    }

    const allowedMoves = this.game!.getAllowedMoves(selectedPiece).map((move) => ({
      ...move,
      realSquare: move.square
    }));

    // add own rooks as castling move targets
    if (!this.game!.is960) {
      [...allowedMoves].forEach(({ square, castling }) => {
        if (castling) {
          allowedMoves.push({
            square: castling.rook.location,
            realSquare: square,
            capture: null,
            castling,
            isPawnPromotion: false
          });
        }
      });
    }

    return allowedMoves;
  };

  makeMove = (square: Square, isDndMove: boolean) => {
    const {
      selectedPiece
    } = this.state;

    if (!selectedPiece) {
      return;
    }

    if (GameHelper.isBoardPiece(selectedPiece) && GameHelper.areSquaresEqual(selectedPiece.location, square)) {
      return;
    }

    const allowedMoves = this.getAllowedMoves().filter(({ square: allowedSquare }) => GameHelper.areSquaresEqual(square, allowedSquare));

    this.selectPiece(null);

    if (!allowedMoves.length) {
      return;
    }

    const move = {
      from: selectedPiece.location,
      to: allowedMoves[0].realSquare
    };

    this.selectPiece(null);

    if (allowedMoves.some(({ isPawnPromotion }) => isPawnPromotion)) {
      this.setState({
        promotionModalVisible: true,
        promotionMove: move
      });
    } else {
      this.game!.move(move);

      if (!this.game!.isDarkChess) {
        _.last(this.game!.moves)!.isDndMove = isDndMove;
      }
    }
  };

  closePromotionPopup = () => {
    this.setState({
      promotionModalVisible: false,
      promotionMove: null
    });
  };

  promoteToPiece = (location: PiecePocketLocation) => {
    this.game!.move({
      ...this.state.promotionMove!,
      promotion: location.pieceType
    });
    this.closePromotionPopup();
  };

  startDraggingPiece = (e: React.MouseEvent, location: RealPieceLocation) => {
    const draggedPiece = location.type === PieceLocationEnum.BOARD
      ? this.game!.getBoardPiece(location)
      : this.game!.getPocketPiece(location.pieceType, this.player!.color);

    if (draggedPiece && draggedPiece.color === this.player!.color) {
      this.dragX = e.pageX;
      this.dragY = e.pageY;

      this.setState({
        selectedPiece: draggedPiece,
        isDragging: true
      });
    }
  };

  onMouseMove = (e: MouseEvent) => {
    if (!this.state.isDragging) {
      return;
    }

    const pieceSize = this.game!.getPieceSize(this.state.squareSize);

    this.dragX = e.pageX;
    this.dragY = e.pageY;

    this.draggingPieceRef.current!.transform.baseVal.getItem(0).setTranslate(this.dragX - pieceSize / 2, this.dragY - pieceSize / 2);
  };

  onMouseUp = (e: MouseEvent) => {
    if (!this.state.isDragging) {
      return;
    }

    this.setState({
      isDragging: false
    });

    if (
      !document.elementsFromPoint(e.pageX, e.pageY).some((element) => {
        try {
          const squareJSON = (element as HTMLElement).dataset.square;

          if (!squareJSON) {
            return false;
          }

          this.makeMove(JSON.parse(squareJSON), true);

          return true;
        } catch (err) {
          return false;
        }
      })
    ) {
      this.selectPiece(null);
    }
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
          validPromotions,
          isAliceChess,
          drawOffer,
          takebackRequest,
          timeControl,
          result,
          darkChessMode,
          showDarkChessHiddenPieces,
          lastMoveTimestamp,
          timeDiff,
          currentMoveIndex
        } = this.game!;
        const {
          isBlackBase,
          boardsShiftX,
          selectedPiece,
          isDragging,
          squareSize
        } = this.state;
        const usedMoves = this.game!.getUsedMoves();
        const player = this.player;
        const isBoardAtTop = isAliceChess;
        const isCurrentMoveLast = currentMoveIndex === usedMoves.length - 1;
        const pieceSize = this.game!.getPieceSize(squareSize);
        const readOnly = (
          !player
          || player.color !== turn
          || status !== GameStatusEnum.ONGOING
          || !isCurrentMoveLast
        );

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
              isBasicTakeback={!!takebackRequest && takebackRequest.moveIndex === usedMoves.length - 2}
              darkChessMode={darkChessMode}
              showDarkChessHiddenPieces={showDarkChessHiddenPieces}
              player={player}
              boardsShiftX={boardsShiftX}
              flipBoard={this.flipBoard}
              changeDarkChessMode={this.changeDarkChessMode}
              toggleShowDarkChessHiddenPieces={this.toggleShowDarkChessHiddenPieces}
              setBoardsShiftX={this.setBoardsShiftX}
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
              makeMove={this.makeMove}
              selectPiece={this.selectPiece}
              startDraggingPiece={this.startDraggingPiece}
              getAllowedMoves={this.getAllowedMoves}
              readOnly={readOnly}
              isBlackBase={isBlackBase}
              isDragging={isDragging}
              darkChessMode={darkChessMode}
              currentMove={usedMoves[currentMoveIndex]}
              boardsShiftX={boardsShiftX}
              squareSize={squareSize}
            />

            <RightPanel
              game={this.game!}
              players={players}
              player={player}
              pieces={pieces}
              currentMoveIndex={currentMoveIndex}
              timeControl={timeControl}
              moves={usedMoves}
              readOnly={readOnly}
              isBlackBase={isBlackBase}
              status={status}
              timeDiff={timeDiff}
              lastMoveTimestamp={lastMoveTimestamp}
              selectedPiece={
                selectedPiece && selectedPiece.location.type === PieceLocationEnum.POCKET
                  ? selectedPiece as PocketPiece
                  : null
              }
              selectPiece={this.selectPiece}
              startDraggingPiece={this.startDraggingPiece}
            />

            <Modal
              visible={this.state.promotionModalVisible}
              onOverlayClick={this.closePromotionPopup}
              className="promotion-modal"
            >
              <div className="modal-content">
                {validPromotions.map((pieceType) => (
                  <Piece
                    key={pieceType}
                    piece={{
                      type: pieceType,
                      color: player ? player.color : ColorEnum.WHITE,
                      location: {
                        type: PieceLocationEnum.POCKET,
                        pieceType
                      }
                    }}
                    onClick={this.promoteToPiece}
                  />
                ))}
              </div>
            </Modal>

            {isDragging && selectedPiece && (
              <FixedElement>
                <svg
                  ref={this.draggingPieceRef}
                  transform={`translate(${this.dragX - pieceSize / 2}, ${this.dragY - pieceSize / 2})`}
                >
                  <GamePiece
                    piece={selectedPiece}
                    pieceSize={pieceSize}
                  />
                </svg>
              </FixedElement>
            )}

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
