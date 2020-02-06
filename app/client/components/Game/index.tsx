import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router-dom';
import io = require('socket.io-client');
import classNames from 'classnames';

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
  PieceTypeEnum,
  Player,
  PocketPiece,
  RealPiece,
  RealPieceLocation,
  Square
} from '../../../types';
import {
  GAME_VARIANT_NAMES
} from '../../../shared/constants';
import { ALICE_CHESS_BOARDS_MARGIN, GAME_GRID_GAP } from '../../constants';
import { Game as GameHelper } from '../../helpers';
import { ReduxState } from '../../store';

import DocumentTitle from '../DocumentTitle';
import FixedElement from '../FixedElement';
import RightPanel from '../RightPanel';
import InfoActionsPanel from '../InfoActionsPanel';
import Chat from '../Chat';
import Boards from '../Boards';
import GamePiece from '../GamePiece';
import PromotionModal from '../PromotionModal';

import './index.less';

type Props = ReturnType<typeof mapStateToProps> & RouteComponentProps<{ gameId: string }>;

interface State {
  gameData: IGame | DarkChessGame | null;
  selectedPiece: RealPiece | null;
  isBlackBase: boolean;
  showHiddenPieces: boolean;
  boardsWidth: number;
  boardsShiftX: number;
  promotionModalVisible: boolean;
  promotionMove: BaseMove | null;
  isDragging: boolean;
  gridMode: 'desktop' | 'tablet' | 'mobile';
}

class Game extends React.Component<Props, State> {
  socket?: io.Socket;
  player: Player | null = null;
  game?: GameHelper;
  draggingPieceRef = React.createRef<SVGSVGElement>();
  draggingPieceTranslate: string = 'none';
  prevMoveIndex = -1;
  state: State = {
    selectedPiece: null,
    gameData: null,
    isBlackBase: false,
    showHiddenPieces: true,
    boardsWidth: 0,
    boardsShiftX: 0,
    promotionModalVisible: false,
    promotionMove: null,
    isDragging: false,
    gridMode: 'desktop'
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

    this.updateGridLayout();

    window.addEventListener('resize', this.onWindowResize);
    document.addEventListener('mousemove', this.dragPiece);
    document.addEventListener('touchmove', this.dragPiece, { passive: false });
    document.addEventListener('mouseup', this.endDraggingPiece);
    document.addEventListener('touchend', this.endDraggingPiece);
  }

  componentWillUnmount() {
    this.socket!.disconnect();

    window.removeEventListener('resize', this.onWindowResize);
    document.removeEventListener('mousemove', this.dragPiece);
    document.removeEventListener('touchmove', this.dragPiece);
    document.removeEventListener('mouseup', this.endDraggingPiece);
    document.removeEventListener('touchend', this.endDraggingPiece);
  }

  componentDidUpdate(): void {
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

  getEventPoint(e: React.MouseEvent | MouseEvent | React.TouchEvent | TouchEvent): { x: number; y: number; } {
    return 'changedTouches' in e
      ? { x: e.changedTouches[0].pageX, y: e.changedTouches[0].pageY }
      : { x: e.pageX, y: e.pageY };
  }

  getDraggingPieceTranslate(e: React.MouseEvent | MouseEvent | React.TouchEvent | TouchEvent) {
    const point = this.getEventPoint(e);
    const pieceSize = this.getPieceSize();

    return `translate(${point.x - pieceSize / 2}px, ${point.y - pieceSize / 2}px)`;
  }

  getPieceSize(): number {
    return 100;
  }

  updateGridLayout() {
    if (!this.game) {
      return;
    }

    const {
      scrollSize
    } = this.props;
    const {
      boardCount,
      boardSidesRenderedRatio
    } = this.game;
    const availableWidth = window.innerWidth - 2 * GAME_GRID_GAP - scrollSize;
    const availableHeight = window.innerHeight - 2 * GAME_GRID_GAP - 30;
    const maxBoardWidth = availableHeight * boardSidesRenderedRatio;
    const maxBoardsWidth = maxBoardWidth * boardCount + ALICE_CHESS_BOARDS_MARGIN * (boardCount - 1);
    let gridMode: 'desktop' | 'tablet' | 'mobile';
    let boardsWidth: number;

    if (maxBoardsWidth + 2 * GAME_GRID_GAP + 300 + 300 <= availableWidth) {
      gridMode = 'desktop';
      boardsWidth = maxBoardWidth;
    } else if (maxBoardsWidth + GAME_GRID_GAP + 300 <= availableWidth) {
      gridMode = 'tablet';
      boardsWidth = maxBoardsWidth;
    } else {
      gridMode = 'mobile';
      boardsWidth = availableWidth;
    }

    console.log(availableWidth, availableHeight, maxBoardWidth, maxBoardsWidth, gridMode, boardsWidth);

    this.setState({
      boardsWidth,
      gridMode
    });
  }

  onWindowResize = () => {
    this.updateGridLayout();
  };

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
      isBlackBase: this.getStartingIsBlackBase()
    });
    this.updateGridLayout();

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

  getAllowedMoves = function* (this: Game): Generator<BoardPossibleMove, any, any> {
    const {
      selectedPiece
    } = this.state;

    if (!selectedPiece) {
      return;
    }

    const allowedMoves = this.game!
      .getAllowedMoves(selectedPiece)
      .map((move) => ({ ...move, realSquare: move.square }))
      .toArray();

    yield* allowedMoves;

    // add own rooks as castling move targets
    if (!this.game!.is960) {
      for (const move of allowedMoves) {
        if (move.castling) {
          yield {
            ...move,
            square: move.castling.rook.location,
            realSquare: move.square
          };
        }
      }
    }
  }.bind(this);

  makeMove = (square: Square, isDndMove: boolean) => {
    const {
      selectedPiece
    } = this.state;

    if (!selectedPiece) {
      this.setState({
        isDragging: false
      });

      return;
    }

    // TODO: if dnd only this if should not be run
    if (GameHelper.isBoardPiece(selectedPiece) && GameHelper.areSquaresEqual(selectedPiece.location, square)) {
      this.setState({
        isDragging: false
      });

      return;
    }

    const allowedMove = this.getAllowedMoves().find(({ square: allowedSquare }) => GameHelper.areSquaresEqual(square, allowedSquare));

    this.setState({
      isDragging: false,
      selectedPiece: null
    });

    if (!allowedMove) {
      return;
    }

    const move = {
      from: selectedPiece.location,
      to: allowedMove.realSquare
    };

    if (allowedMove.isPawnPromotion) {
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

  promoteToPiece = (pieceType: PieceTypeEnum) => {
    this.game!.move({
      ...this.state.promotionMove!,
      promotion: pieceType
    });
    this.closePromotionPopup();
  };

  startDraggingPiece = (e: React.MouseEvent | React.TouchEvent, location: RealPieceLocation) => {
    const {
      isTouchDevice
    } = this.props;

    if (e.type === 'mousedown' && (isTouchDevice || (e as React.MouseEvent).button !== 0)) {
      return;
    }

    const draggedPiece = location.type === PieceLocationEnum.BOARD
      ? this.game!.getBoardPiece(location)
      : this.game!.getPocketPiece(location.pieceType, location.color);

    if (
      draggedPiece
      && draggedPiece.color === this.player!.color
      && (
        !GameHelper.isBoardPiece(draggedPiece)
        || this.getAllowedMoves().all(({ square }) => !GameHelper.areSquaresEqual(draggedPiece.location, square))
      )
    ) {
      this.draggingPieceTranslate = this.getDraggingPieceTranslate(e);

      this.setState({
        selectedPiece: draggedPiece,
        isDragging: true
      });
    }
  };

  dragPiece = (e: MouseEvent | TouchEvent) => {
    if (!this.state.isDragging) {
      return;
    }

    e.preventDefault();

    this.draggingPieceRef.current!.style.transform = this.draggingPieceTranslate = this.getDraggingPieceTranslate(e);
  };

  endDraggingPiece = (e: MouseEvent | TouchEvent) => {
    if (!this.state.isDragging) {
      return;
    }

    const point = this.getEventPoint(e);

    if (
      !document.elementsFromPoint(point.x, point.y).some((element) => {
        try {
          if (
            this.state.selectedPiece
            && GameHelper.isPocketPiece(this.state.selectedPiece)
            && (element as HTMLElement).dataset.pocketPiece === this.state.selectedPiece.location.pieceType
          ) {
            this.setState({
              isDragging: false
            });

            return true;
          }

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
      this.setState({
        isDragging: false,
        selectedPiece: null
      });
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
          boardsWidth,
          boardsShiftX,
          selectedPiece,
          isDragging,
          gridMode
        } = this.state;
        const usedMoves = this.game!.getUsedMoves();
        const player = this.player;
        const isCurrentMoveLast = currentMoveIndex === usedMoves.length - 1;
        const readOnly = (
          !player
          || player.color !== turn
          || status !== GameStatusEnum.ONGOING
          || !isCurrentMoveLast
        );

        content = (
          <div
            className={classNames('game', `grid-${gridMode}-style`)}
            style={{
              '--boards-width': `${boardsWidth}px`,
              '--grid-gap': `${GAME_GRID_GAP}px`
            } as React.CSSProperties}
          >

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
              enableClick={!readOnly}
              enableDnd={!readOnly}
              isBlackBase={isBlackBase}
              isDragging={isDragging}
              darkChessMode={darkChessMode}
              currentMove={usedMoves[currentMoveIndex]}
              boardsShiftX={boardsShiftX}
            />

            <RightPanel
              game={this.game!}
              players={players}
              player={player}
              pieces={pieces}
              currentMoveIndex={currentMoveIndex}
              timeControl={timeControl}
              moves={usedMoves}
              enableClick={!readOnly}
              enableDnd={!readOnly}
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

            <PromotionModal
              game={this.game!}
              visible={this.state.promotionModalVisible}
              onOverlayClick={this.closePromotionPopup}
              promoteToPiece={this.promoteToPiece}
            />

            {isDragging && selectedPiece && (
              <FixedElement>
                <svg
                  ref={this.draggingPieceRef}
                  style={{ transform: this.draggingPieceTranslate }}
                >
                  <GamePiece
                    piece={selectedPiece}
                    pieceSize={this.getPieceSize()}
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

function mapStateToProps(state: ReduxState) {
  return {
    isTouchDevice: state.common.isTouchDevice,
    scrollSize: state.common.scrollSize
  };
}

export default connect(mapStateToProps)(Game);
