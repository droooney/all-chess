import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router-dom';
import io = require('socket.io-client');
import classNames from 'classnames';

import {
  BaseMove,
  BoardPiece,
  BoardPossibleMove,
  ColorEnum,
  DarkChessGame,
  DarkChessGameInitialData,
  DrawnSymbol,
  Game as IGame,
  GameInitialData,
  GameStatusEnum,
  GetPossibleMovesMode,
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
import GamePlayer from '../GamePlayer';
import GameInfo from '../GameInfo';
import GameActions from '../GameActions';
import MovesPanel from 'client/components/MovesPanel';
import Chat from '../Chat';
import Boards from '../Boards';
import GamePiece from '../GamePiece';
import PromotionModal from '../PromotionModal';

import './index.less';

type Props = ReturnType<typeof mapStateToProps> & RouteComponentProps<{ gameId: string }>;

interface State {
  gameData: IGame | DarkChessGame | null;
  selectedPiece: RealPiece | null;
  selectedPieceBoard: number;
  allowedMoves: BoardPossibleMove[];
  drawingSymbolStart: Square | null;
  drawingSymbol: DrawnSymbol | null;
  drawnSymbols: DrawnSymbol[];
  isBlackBase: boolean;
  showHiddenPieces: boolean;
  boardsWidth: number;
  boardToShow: 'all' | number;
  boardsShiftX: number;
  promotionModalVisible: boolean;
  promotionMove: BaseMove | null;
  validPromotions: readonly PieceTypeEnum[];
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
  prevMoveCount = 0;
  drawnSymbolId = 0;
  state: State = {
    selectedPiece: null,
    selectedPieceBoard: 0,
    allowedMoves: [],
    drawingSymbolStart: null,
    drawingSymbol: null,
    drawnSymbols: [],
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
    document.addEventListener('mousemove', this.drag);
    document.addEventListener('touchmove', this.drag, { passive: false });
    document.addEventListener('mouseup', this.endDrag);
    document.addEventListener('touchend', this.endDrag);
    document.addEventListener('keydown', this.onKeyDown);
  }

  componentWillUnmount() {
    this.socket!.disconnect();

    window.removeEventListener('resize', this.onWindowResize);
    document.removeEventListener('mousemove', this.drag);
    document.removeEventListener('touchmove', this.drag);
    document.removeEventListener('mouseup', this.endDrag);
    document.removeEventListener('touchend', this.endDrag);
    document.removeEventListener('keydown', this.onKeyDown);
  }

  componentDidUpdate(): void {
    if (this.game) {
      if (
        this.prevMoveCount - this.prevMoveIndex !== this.game.getUsedMoves().length - this.game.currentMoveIndex
        && this.prevMoveIndex !== this.game.currentMoveIndex
      ) {
        this.game.cancelPremoves(false);

        this.setState({
          selectedPiece: null,
          allowedMoves: [],
          isDragging: false,
          drawingSymbolStart: null,
          drawingSymbol: null,
          drawnSymbols: []
        });
      }

      this.prevMoveIndex = this.game.currentMoveIndex;
      this.prevMoveCount = this.game.getUsedMoves().length;
    }
  }

  addOrRemoveDrawnSymbol(drawnSymbol: DrawnSymbol, drawnSymbols: DrawnSymbol[]): DrawnSymbol[] {
    const existingIndex = drawnSymbols.findIndex((symbol) => (
      drawnSymbol.type === 'circle'
      && symbol.type === 'circle'
      && GameHelper.areSquaresEqual(drawnSymbol.square, symbol.square, false)
    ) || (
      drawnSymbol.type === 'arrow'
      && symbol.type === 'arrow'
      && GameHelper.areSquaresEqual(drawnSymbol.from, symbol.from, false)
      && GameHelper.areSquaresEqual(drawnSymbol.to, symbol.to, false)
    ));

    return existingIndex === -1
      ? [...drawnSymbols, drawnSymbol]
      : [...drawnSymbols.slice(0, existingIndex), ...drawnSymbols.slice(existingIndex + 1)];
  }

  getBoardPiece(square: Square): BoardPiece | null | false {
    return this.game!.getBoardPiece(square) || (
      this.props.showFantomPieces
      && this.game!.getBoardPiece({ ...square, board: this.game!.getPrevBoard(square.board) })
    );
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

  isAbleToMove(): boolean {
    return (
      !!this.player
      // TODO: replace true with premovesEnabled
      && (this.player.color === this.game!.turn || true)
      && this.game!.status === GameStatusEnum.ONGOING
      && this.game!.currentMoveIndex === this.game!.getUsedMoves().length - 1
    );
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

      if (maxHeight >= availableDesktopHeight * 0.8) {
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

          if (maxHeight >= availableTabletHeight * 0.8) {
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

            if (maxHeight >= availableTabletHeight * 0.8) {
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
    this.prevMoveIndex = -1;
    this.prevMoveCount = this.game.getUsedMoves().length;

    this.game.on('updateChat', () => {
      this.forceUpdate();
    });

    this.game.on('updateGame', () => {
      if (
        this.state.selectedPiece
        && this.prevMoveCount !== this.game!.getUsedMoves().length
        && this.player
        && this.game!.turn === this.player.color
      ) {
        this.setState({
          allowedMoves: this.getAllowedMoves(this.state.selectedPiece, this.state.selectedPieceBoard).toArray()
        });
      } else {
        this.forceUpdate();
      }
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

  selectPiece = (selectedPiece: RealPiece | null, selectedPieceBoard: number = 0) => {
    this.setState({
      selectedPiece,
      selectedPieceBoard,
      allowedMoves: selectedPiece
        ? this.getAllowedMoves(selectedPiece, selectedPieceBoard).toArray()
        : [],
      drawnSymbols: []
    });
  };

  flipBoard = () => {
    this.setState(({ isBlackBase }) => ({
      isBlackBase: !isBlackBase
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

  getAllowedMoves = function* (this: Game, selectedPiece: RealPiece, selectedPieceBoard: number): Generator<BoardPossibleMove, any, any> {
    if (!this.player) {
      return;
    }

    const moves = this.player.color === this.game!.turn
      ? this.game!.getAllowedMoves(selectedPiece)
      : this.game!.getPossibleMoves(selectedPiece, GetPossibleMovesMode.PREMOVES);
    const allowedMoves = moves
      .map((square) => ({
        square: {
          ...square,
          board: GameHelper.isPocketPiece(selectedPiece)
            ? square.board
            : selectedPieceBoard
        },
        realSquare: square
      }))
      .toArray();

    yield* allowedMoves;

    // add own rooks as castling move targets
    if (!this.game!.is960) {
      for (const move of allowedMoves) {
        const castlingRook = this.game!.getCastlingRook(selectedPiece, move.realSquare);

        if (castlingRook) {
          yield {
            ...move,
            square: {
              ...castlingRook.location,
              board: selectedPieceBoard
            },
            realSquare: move.realSquare
          };
        }
      }
    }
  }.bind(this);

  makeMove = (square: Square) => {
    const {
      selectedPiece,
      selectedPieceBoard,
      allowedMoves
    } = this.state;

    if (!selectedPiece) {
      this.setState({
        isDragging: false
      });

      return;
    }

    // TODO: if dnd only this if should not be run
    if (
      GameHelper.isBoardPiece(selectedPiece)
      && GameHelper.areSquaresEqual({ ...selectedPiece.location, board: selectedPieceBoard }, square)
    ) {
      this.setState({
        isDragging: false
      });

      return;
    }

    if (!this.player) {
      return;
    }

    const isPremove = this.player.color !== this.game!.turn;
    const allowedMove = allowedMoves.find(({ square: allowedSquare }) => GameHelper.areSquaresEqual(square, allowedSquare));

    this.setState({
      isDragging: false,
      selectedPiece: null,
      allowedMoves: []
    });

    if (!allowedMove) {
      return;
    }

    const move: BaseMove = {
      from: selectedPiece.location,
      to: allowedMove.realSquare
    };
    const isPawnPromotion = this.game!.isPromoting(selectedPiece, allowedMove.realSquare);
    const validPromotions = isPawnPromotion && !isPremove
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
          ? { ...move, promotion: isPremove ? PieceTypeEnum.QUEEN : validPromotions[0] }
          : move,
        true
      );
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
    }, true);
    this.closePromotionPopup();
  };

  onSquareClick = (square: Square) => {
    const {
      isTouchDevice
    } = this.props;
    const {
      selectedPiece,
      selectedPieceBoard,
      allowedMoves
    } = this.state;
    const enableDnd = true;

    if (!this.isAbleToMove()) {
      this.setState({
        drawnSymbols: []
      });

      return;
    }

    const playerColor = this.player ? this.player.color : null;

    if (!selectedPiece) {
      const pieceInSquare = this.getBoardPiece(square);

      if (!pieceInSquare || playerColor !== pieceInSquare.color) {
        if (isTouchDevice) {
          this.game!.cancelPremoves(true);
        }

        return;
      }

      return this.selectPiece(pieceInSquare, square.board);
    }

    if (
      GameHelper.isBoardPiece(selectedPiece)
      && GameHelper.areSquaresEqual(square, { ...selectedPiece.location, board: selectedPieceBoard })
      && !enableDnd
    ) {
      return this.selectPiece(null);
    }

    const allowedMove = allowedMoves.find(({ square: allowedSquare }) => GameHelper.areSquaresEqual(square, allowedSquare));

    if (!allowedMove) {
      const pieceInSquare = this.getBoardPiece(square);

      if (!pieceInSquare || playerColor !== pieceInSquare.color) {
        if (isTouchDevice) {
          this.game!.cancelPremoves(false);
        }

        return this.selectPiece(null);
      }

      return this.selectPiece(pieceInSquare, square.board);
    }

    this.makeMove(square);
  };

  startDrag = (e: React.MouseEvent | React.TouchEvent, location: RealPieceLocation) => {
    const {
      isTouchDevice
    } = this.props;

    if (
      e.type === 'mousedown'
      && !isTouchDevice
      && (e as React.MouseEvent).button === 2
      && location.type === PieceLocationEnum.BOARD
    ) {
      if (this.game!.premoves.length) {
        this.game!.cancelPremoves(true);
      } else {
        e.preventDefault();

        this.setState({
          selectedPiece: null,
          allowedMoves: [],
          isDragging: true,
          drawingSymbolStart: location,
          drawingSymbol: {
            type: 'circle',
            id: ++this.drawnSymbolId,
            square: location
          }
        });
      }

      return;
    }

    if ((e.type === 'mousedown' && (isTouchDevice || (e as React.MouseEvent).button !== 0)) || !this.isAbleToMove()) {
      return;
    }

    const draggedPiece = location.type === PieceLocationEnum.BOARD
      ? this.getBoardPiece(location)
      : this.game!.getPocketPiece(location.pieceType, location.color);

    if (
      draggedPiece
      && draggedPiece.color === this.player!.color
      && (
        !GameHelper.isBoardPiece(draggedPiece)
        || this.state.allowedMoves.every(({ square }) => !GameHelper.areSquaresEqual(draggedPiece.location, square))
      )
    ) {
      this.draggingPieceTranslate = this.getDraggingPieceTranslate(e);

      const selectedPieceBoard = location.type === PieceLocationEnum.POCKET ? 0 : location.board;

      this.setState({
        selectedPiece: draggedPiece,
        selectedPieceBoard,
        allowedMoves: this.getAllowedMoves(draggedPiece, selectedPieceBoard).toArray(),
        drawnSymbols: [],
        isDragging: true
      });
    } else {
      this.setState(({ drawnSymbols }) => (
        drawnSymbols.length
          ? { drawnSymbols: [] }
          : null
      ));
    }
  };

  drag = (e: MouseEvent | TouchEvent) => {
    if (!this.state.isDragging) {
      return;
    }

    if (this.state.drawingSymbolStart) {
      const point = this.getEventPoint(e);
      let square: Square | null = null;

      document.elementsFromPoint(point.x, point.y).some((element) => {
        try {
          const squareJSON = (element as HTMLElement).dataset.square;

          if (!squareJSON) {
            return false;
          }

          square = JSON.parse(squareJSON);

          return true;
        } catch (err) {
          return false;
        }
      });

      this.setState(({ drawingSymbolStart, drawingSymbol }) => {
        if (!drawingSymbolStart) {
          return null;
        }

        const newDrawingSymbol: DrawnSymbol | null | false = square && drawingSymbolStart.board === square.board && (
          GameHelper.areSquaresEqual(drawingSymbolStart, square)
            ? { type: 'circle', id: this.drawnSymbolId, square: drawingSymbolStart }
            : { type: 'arrow', id: this.drawnSymbolId, from: drawingSymbolStart, to: square }
        );

        if (
          (!drawingSymbol && !newDrawingSymbol)
          || (drawingSymbol && newDrawingSymbol && drawingSymbol.type === 'circle' && newDrawingSymbol.type === 'circle')
          || (
            drawingSymbol
            && newDrawingSymbol
            && drawingSymbol.type === 'arrow'
            && newDrawingSymbol.type === 'arrow'
            && GameHelper.areSquaresEqual(drawingSymbol.to, newDrawingSymbol.to)
          )
        ) {
          return null;
        }

        return {
          drawingSymbol: newDrawingSymbol || null
        };
      });
    } else {
      e.preventDefault();

      this.draggingPieceRef.current!.style.transform = this.draggingPieceTranslate = this.getDraggingPieceTranslate(e);
    }
  };

  endDrag = (e: MouseEvent | TouchEvent) => {
    if (!this.state.isDragging) {
      return;
    }

    if (this.state.drawingSymbolStart) {
      this.setState(({ drawingSymbol, drawnSymbols }) => ({
        isDragging: false,
        drawingSymbolStart: null,
        drawingSymbol: null,
        drawnSymbols: drawingSymbol
          ? this.addOrRemoveDrawnSymbol(drawingSymbol, drawnSymbols)
          : drawnSymbols
      }));

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

          this.makeMove(JSON.parse(squareJSON));

          return true;
        } catch (err) {
          return false;
        }
      })
    ) {
      this.setState({
        isDragging: false,
        selectedPiece: null,
        allowedMoves: []
      });
    }
  };

  render() {
    let content: JSX.Element | string;
    let title: string | null;

    if (this.state.gameData && this.game) {
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
          players,
          drawOffer,
          takebackRequest,
          timeControl,
          result,
          startingMoveIndex,
          darkChessMode,
          showDarkChessHiddenPieces,
          lastMoveTimestamp,
          timeDiff,
          currentMoveIndex,
          premoves
        } = this.game;
        const {
          isBlackBase,
          boardsWidth,
          boardToShow,
          boardsShiftX,
          selectedPiece,
          isDragging,
          gridMode
        } = this.state;
        const usedMoves = this.game.getUsedMoves();
        const player = this.player;
        const isCurrentMoveLast = currentMoveIndex === usedMoves.length - 1;
        const readOnly = !this.isAbleToMove();
        const enableClick = !readOnly;
        const enableDnd = !readOnly;
        const pieceSize = this.getPieceSize();
        const realTurn = (usedMoves.length + startingMoveIndex) % 2 === 1
          ? ColorEnum.BLACK
          : ColorEnum.WHITE;
        const topPlayer = isBlackBase
          ? players[ColorEnum.WHITE]
          : players[ColorEnum.BLACK];
        const bottomPlayer = isBlackBase
          ? players[ColorEnum.BLACK]
          : players[ColorEnum.WHITE];
        const adjustedLastMoveTimestamp = lastMoveTimestamp + timeDiff;
        const materialDifference: Record<PieceTypeEnum, number> = {} as any;
        let allMaterialDifference = 0;

        if (this.game.needToCalculateMaterialDifference) {
          const actualPieces = premoves.length
            ? this.game.piecesBeforePremoves
            : pieces;

          _.forEach(PieceTypeEnum, (pieceType) => {
            const getPiecesCount = (color: ColorEnum): number => (
              actualPieces.filter((piece) => (
                GameHelper.isRealPiece(piece)
                && (piece.abilities || piece.type) === pieceType
                && piece.color === color
              )).length
            );

            const diff = materialDifference[pieceType] = getPiecesCount(ColorEnum.WHITE) - getPiecesCount(ColorEnum.BLACK);

            allMaterialDifference += diff * this.game!.piecesWorth[pieceType];
          });
        }

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
            <div className="game-content">
              <GameActions
                game={this.game}
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

              <Boards
                game={this.game}
                pieces={pieces}
                player={player}
                selectedPiece={
                  selectedPiece
                    ? selectedPiece
                    : null
                }
                selectedPieceBoard={this.state.selectedPieceBoard}
                allowedMoves={this.state.allowedMoves}
                premoves={premoves}
                drawnSymbols={
                  this.state.drawingSymbol
                    ? [...this.state.drawnSymbols, this.state.drawingSymbol]
                    : this.state.drawnSymbols
                }
                onSquareClick={this.onSquareClick}
                startDraggingPiece={this.startDrag}
                enableClick={!!player}
                enableDnd={!!player}
                isBlackBase={isBlackBase}
                isDragging={isDragging}
                boardToShow={boardToShow}
                darkChessMode={darkChessMode}
                currentMove={usedMoves[currentMoveIndex]}
                boardsShiftX={boardsShiftX}
                showKingAttack={!premoves.length}
              />

              <GamePlayer
                game={this.game}
                player={topPlayer}
                playingPlayer={player}
                pieces={pieces}
                moves={usedMoves}
                timeControl={timeControl}
                realTurn={realTurn}
                status={status}
                adjustedLastMoveTimestamp={adjustedLastMoveTimestamp}
                enableClick={enableClick && !!player && topPlayer.login === player.login}
                enableDnd={enableDnd && !!player && topPlayer.login === player.login}
                isTop
                allMaterialDifference={allMaterialDifference}
                materialDifference={materialDifference}
                selectedPiece={
                  selectedPiece && selectedPiece.color === topPlayer.color && GameHelper.isPocketPiece(selectedPiece)
                    ? selectedPiece
                    : null
                }
                selectPiece={this.selectPiece}
                startDraggingPiece={this.startDrag}
              />

              <GamePlayer
                game={this.game}
                player={bottomPlayer}
                playingPlayer={player}
                pieces={pieces}
                moves={usedMoves}
                timeControl={timeControl}
                realTurn={realTurn}
                status={status}
                adjustedLastMoveTimestamp={adjustedLastMoveTimestamp}
                enableClick={enableClick && !!player && bottomPlayer.login === player.login}
                enableDnd={enableDnd && !!player && bottomPlayer.login === player.login}
                isTop={false}
                allMaterialDifference={allMaterialDifference}
                materialDifference={materialDifference}
                selectedPiece={
                  selectedPiece && selectedPiece.color === bottomPlayer.color && GameHelper.isPocketPiece(selectedPiece)
                    ? selectedPiece
                    : null
                }
                selectPiece={this.selectPiece}
                startDraggingPiece={this.startDrag}
              />

              <MovesPanel
                game={this.game}
                currentMoveIndex={currentMoveIndex}
                moves={usedMoves}
              />

              <PromotionModal
                game={this.game}
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

            <GameInfo
              game={this.game}
              result={result}
            />

            <Chat
              chat={chat}
              sendMessage={this.sendMessage}
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

function mapStateToProps(state: ReduxState) {
  return {
    isTouchDevice: state.common.isTouchDevice,
    scrollSize: state.common.scrollSize,
    showFantomPieces: state.gameSettings.showFantomPieces
  };
}

export default connect(mapStateToProps)(Game);
