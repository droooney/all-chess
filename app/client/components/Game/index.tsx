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
  RealPiece,
  RealPieceLocation,
  Square
} from '../../../types';
import {
  GAME_VARIANT_NAMES
} from '../../../shared/constants';
import {
  ALICE_CHESS_BOARDS_MARGIN,
  GAME_GRID_GAP,
  MIN_LEFT_DESKTOP_PANEL_WIDTH,
  MAX_LEFT_DESKTOP_PANEL_WIDTH,
  MIN_RIGHT_DESKTOP_PANEL_WIDTH,
  MAX_RIGHT_DESKTOP_PANEL_WIDTH,
  MIN_TABLET_PANEL_WIDTH,
  MAX_TABLET_PANEL_WIDTH
} from '../../constants';
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
  boardToShow: 'all' | number;
  boardsShiftX: number;
  promotionModalVisible: boolean;
  promotionMove: BaseMove | null;
  validPromotions: PieceTypeEnum[];
  isDragging: boolean;
  gridMode: 'desktop' | 'tablet' | 'mobile';
  leftDesktopPanelWidth: number;
  rightDesktopPanelWidth: number;
  tabletPanelWidth: number;
}

const INPUT_ELEMENTS = ['input', 'textarea'];

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
    boardToShow: 'all',
    boardsShiftX: 0,
    promotionModalVisible: false,
    promotionMove: null,
    validPromotions: [],
    isDragging: false,
    gridMode: 'desktop',
    leftDesktopPanelWidth: 0,
    rightDesktopPanelWidth: 0,
    tabletPanelWidth: 0
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
    document.addEventListener('keydown', this.onKeyDown);
  }

  componentWillUnmount() {
    this.socket!.disconnect();

    window.removeEventListener('resize', this.onWindowResize);
    document.removeEventListener('mousemove', this.dragPiece);
    document.removeEventListener('touchmove', this.dragPiece);
    document.removeEventListener('mouseup', this.endDraggingPiece);
    document.removeEventListener('touchend', this.endDraggingPiece);
    document.removeEventListener('keydown', this.onKeyDown);
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
      ? { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }
      : { x: e.clientX, y: e.clientY };
  }

  getDraggingPieceTranslate(e: React.MouseEvent | MouseEvent | React.TouchEvent | TouchEvent) {
    const point = this.getEventPoint(e);
    const pieceSize = this.getPieceSize();

    return `translate(${point.x - pieceSize / 2}px, ${point.y - pieceSize / 2}px)`;
  }

  getPieceSize(): number {
    const {
      boardsWidth,
      boardToShow
    } = this.state;
    const {
      boardCount,
      boardCenterX
    } = this.game!;
    const boardWidth = Math.max(
      boardToShow === 'all'
        ? (boardsWidth - (boardCount - 1) * ALICE_CHESS_BOARDS_MARGIN) / boardCount
        : boardsWidth,
      0
    );

    return this.game!.getPieceSize() * boardWidth / (2 * boardCenterX);
  }

  updateGridLayout() {
    if (!this.game) {
      return;
    }

    const {
      scrollSize
    } = this.props;
    const {
      boardToShow: currentBoardToShow
    } = this.state;
    const {
      boardCount,
      boardSidesRenderedRatio
    } = this.game;
    const availableDesktopWidth = window.innerWidth - 2 * GAME_GRID_GAP - scrollSize;
    const availableTabletWidth = window.innerWidth - 2 * GAME_GRID_GAP - scrollSize;
    const availableMobileWidth = window.innerWidth - scrollSize;
    const availableDesktopHeight = window.innerHeight - 2 * GAME_GRID_GAP - 30;
    const availableTabletHeight = window.innerHeight - 2 * GAME_GRID_GAP - 30;
    // const availableMobileHeight = window.innerHeight - 2 * GAME_GRID_GAP - 30;
    const maxAvailableDesktopWidth = (
      availableDesktopWidth
      - MIN_LEFT_DESKTOP_PANEL_WIDTH
      - MIN_RIGHT_DESKTOP_PANEL_WIDTH
      - 2 * GAME_GRID_GAP
    );
    const maxDesktopBoardWidth = availableDesktopHeight * boardSidesRenderedRatio;
    const maxDesktopBoardsWidth = maxDesktopBoardWidth * boardCount + ALICE_CHESS_BOARDS_MARGIN * (boardCount - 1);
    const numberBoardToShow = currentBoardToShow !== 'all' && currentBoardToShow;
    let gridMode: 'desktop' | 'tablet' | 'mobile';
    let boardsWidth: number;
    let boardToShow: 'all' | number;
    let leftDesktopPanelWidth: number;
    let rightDesktopPanelWidth: number;
    let tabletPanelWidth: number;

    if (maxDesktopBoardsWidth <= maxAvailableDesktopWidth) {
      gridMode = 'desktop';
      boardsWidth = maxDesktopBoardsWidth;
      boardToShow = 'all';
      leftDesktopPanelWidth = Math.min(
        MAX_LEFT_DESKTOP_PANEL_WIDTH,
        MIN_LEFT_DESKTOP_PANEL_WIDTH + (maxAvailableDesktopWidth - maxDesktopBoardsWidth)
        * MAX_LEFT_DESKTOP_PANEL_WIDTH / (MAX_LEFT_DESKTOP_PANEL_WIDTH + MAX_RIGHT_DESKTOP_PANEL_WIDTH)
      );
      rightDesktopPanelWidth = Math.min(
        MAX_LEFT_DESKTOP_PANEL_WIDTH,
        MIN_LEFT_DESKTOP_PANEL_WIDTH + (maxAvailableDesktopWidth - maxDesktopBoardsWidth)
        * MAX_LEFT_DESKTOP_PANEL_WIDTH / (MAX_LEFT_DESKTOP_PANEL_WIDTH + MAX_RIGHT_DESKTOP_PANEL_WIDTH)
      );
      tabletPanelWidth = 0;
    } else {
      const maxHeight = (maxAvailableDesktopWidth - ALICE_CHESS_BOARDS_MARGIN * (boardCount - 1)) / boardCount / boardSidesRenderedRatio;

      if (maxHeight >= availableDesktopHeight * 0.9) {
        gridMode = 'desktop';
        boardsWidth = maxAvailableDesktopWidth;
        boardToShow = 'all';
        leftDesktopPanelWidth = MIN_LEFT_DESKTOP_PANEL_WIDTH;
        rightDesktopPanelWidth = MIN_RIGHT_DESKTOP_PANEL_WIDTH;
        tabletPanelWidth = 0;
      } else {
        const maxAvailableTabletWidth = (
          availableTabletWidth
          - MIN_TABLET_PANEL_WIDTH
          - GAME_GRID_GAP
        );
        const maxTabletBoardWidth = availableTabletHeight * boardSidesRenderedRatio;
        const maxTabletBoardsWidth = maxDesktopBoardWidth * boardCount + ALICE_CHESS_BOARDS_MARGIN * (boardCount - 1);

        if (maxTabletBoardsWidth <= maxAvailableTabletWidth) {
          gridMode = 'tablet';
          boardsWidth = maxTabletBoardsWidth;
          boardToShow = 'all';
          leftDesktopPanelWidth = 0;
          rightDesktopPanelWidth = 0;
          tabletPanelWidth = Math.min(
            MAX_TABLET_PANEL_WIDTH,
            MIN_TABLET_PANEL_WIDTH + (maxAvailableTabletWidth - maxTabletBoardsWidth)
          );
        } else {
          const maxHeight = (maxAvailableTabletWidth - ALICE_CHESS_BOARDS_MARGIN * (boardCount - 1)) / boardCount / boardSidesRenderedRatio;

          if (maxHeight >= availableTabletHeight * 0.75) {
            gridMode = 'tablet';
            boardsWidth = maxAvailableTabletWidth;
            boardToShow = 'all';
            leftDesktopPanelWidth = 0;
            rightDesktopPanelWidth = 0;
            tabletPanelWidth = MIN_TABLET_PANEL_WIDTH;
          } else if (maxTabletBoardWidth <= maxAvailableTabletWidth) {
            gridMode = 'tablet';
            boardsWidth = maxTabletBoardWidth;
            boardToShow = numberBoardToShow || 0;
            leftDesktopPanelWidth = 0;
            rightDesktopPanelWidth = 0;
            tabletPanelWidth = Math.min(
              MAX_TABLET_PANEL_WIDTH,
              MIN_TABLET_PANEL_WIDTH + (maxAvailableTabletWidth - maxTabletBoardWidth)
            );
          } else {
            const maxHeight = maxAvailableTabletWidth / boardSidesRenderedRatio;

            if (maxHeight >= availableTabletHeight * 0.75) {
              gridMode = 'tablet';
              boardsWidth = maxAvailableTabletWidth;
              boardToShow = numberBoardToShow || 0;
              leftDesktopPanelWidth = 0;
              rightDesktopPanelWidth = 0;
              tabletPanelWidth = MIN_TABLET_PANEL_WIDTH;
            } else {
              gridMode = 'mobile';
              boardsWidth = availableMobileWidth;
              boardToShow = numberBoardToShow || 0;
              leftDesktopPanelWidth = 0;
              rightDesktopPanelWidth = 0;
              tabletPanelWidth = 0;
            }
          }
        }
      }
    }

    this.setState({
      boardsWidth,
      boardToShow,
      gridMode,
      leftDesktopPanelWidth,
      rightDesktopPanelWidth,
      tabletPanelWidth
    });
  }

  onWindowResize = () => {
    this.updateGridLayout();
  };

  onKeyDown = (e: KeyboardEvent) => {
    const {
      boardToShow
    } = this.state;
    const game = this.game;

    if (game && (!e.target || !INPUT_ELEMENTS.includes((e.target as HTMLElement).tagName.toLowerCase()))) {
      let preventDefault = true;

      if (e.key === 'ArrowLeft') {
        game.moveBack();
      } else if (e.key === 'ArrowRight') {
        game.moveForward();
      } else if (e.key === 'ArrowUp') {
        game.navigateToMove(-1);
      } else if (e.key === 'ArrowDown') {
        game.navigateToMove(game.getUsedMoves().length - 1);
      } else if (e.key === '1' || e.key === '2') {
        if (boardToShow !== 'all') {
          this.switchBoard(+e.key - 1);
        }
      } else {
        preventDefault = false;
      }

      if (preventDefault) {
        e.preventDefault();
      }
    }
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

  switchBoard = (boardToShow: number) => {
    this.setState({
      boardToShow
    });
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
      .map((square) => ({ square, realSquare: square }))
      .toArray();

    yield* allowedMoves;

    // add own rooks as castling move targets
    if (!this.game!.is960) {
      for (const move of allowedMoves) {
        const castlingRook = this.game!.getCastlingRook(selectedPiece, move.square);

        if (castlingRook) {
          yield {
            ...move,
            square: castlingRook.location,
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
    const isPawnPromotion = this.game!.isPromoting(selectedPiece, allowedMove.realSquare);
    const validPromotions = isPawnPromotion
      ? this.game!.validPromotions.filter((promotion) => (
        this.game!.isMoveAllowed(selectedPiece, allowedMove.realSquare, promotion)
      ))
      : [];

    if (isPawnPromotion && validPromotions.length > 1) {
      this.setState({
        promotionModalVisible: true,
        promotionMove: move,
        validPromotions
      });
    } else {
      this.game!.move(
        isPawnPromotion
          ? move
          : { ...move, promotion: validPromotions[0] }
      );

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
          boardToShow,
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
        const pieceSize = this.getPieceSize();

        content = (
          <div
            className={classNames('game', `grid-${gridMode}-style`)}
            style={{
              '--boards-width': `${boardsWidth}px`,
              '--grid-gap': `${GAME_GRID_GAP}px`,
              '--left-desktop-panel-width': `${this.state.leftDesktopPanelWidth}px`,
              '--right-desktop-panel-width': `${this.state.rightDesktopPanelWidth}px`,
              '--tablet-panel-width': `${this.state.tabletPanelWidth}px`
            } as React.CSSProperties}
          >

            <InfoActionsPanel
              game={this.game!}
              result={result}
              players={players}
              isBlackBase={isBlackBase}
              isNoMovesMade={usedMoves.length === 0}
              isCurrentMoveLast={isCurrentMoveLast}
              boardToShow={boardToShow}
              drawOffer={drawOffer}
              takebackRequest={takebackRequest}
              isBasicTakeback={!!takebackRequest && takebackRequest.moveIndex === usedMoves.length - 2}
              darkChessMode={darkChessMode}
              showDarkChessHiddenPieces={showDarkChessHiddenPieces}
              player={player}
              boardsShiftX={boardsShiftX}
              flipBoard={this.flipBoard}
              switchBoard={this.switchBoard}
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
              boardToShow={boardToShow}
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
                selectedPiece && GameHelper.isPocketPiece(selectedPiece)
                  ? selectedPiece
                  : null
              }
              selectPiece={this.selectPiece}
              startDraggingPiece={this.startDraggingPiece}
            />

            <PromotionModal
              game={this.game!}
              visible={this.state.promotionModalVisible}
              square={this.state.promotionMove && this.state.promotionMove.to}
              pieceSize={pieceSize}
              isBlackBase={isBlackBase}
              validPromotions={this.state.validPromotions}
              onOverlayClick={this.closePromotionPopup}
              promoteToPiece={this.promoteToPiece}
            />

            {isDragging && selectedPiece && (
              <FixedElement>
                <svg
                  ref={this.draggingPieceRef}
                  style={{
                    pointerEvents: 'none',
                    transform: this.draggingPieceTranslate
                  }}
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

function mapStateToProps(state: ReduxState) {
  return {
    isTouchDevice: state.common.isTouchDevice,
    scrollSize: state.common.scrollSize
  };
}

export default connect(mapStateToProps)(Game);
