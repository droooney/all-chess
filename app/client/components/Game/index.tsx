import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import classNames from 'classnames';

import {
  ALICE_CHESS_BOARDS_MARGIN,
} from 'client/constants';

import {
  BaseMove,
  BoardPiece,
  BoardPossibleMove,
  ColorEnum,
  DrawnSymbol,
  DrawnSymbolColor,
  EachPieceType,
  GameStatusEnum,
  GetPossibleMovesMode,
  PieceLocationEnum,
  PieceTypeEnum,
  RealPiece,
  RealPieceLocation,
  Square,
} from 'shared/types';

import { Game as GameHelper } from 'client/helpers';

import { ReduxState } from 'client/store';

import MovesPanel from 'client/components/MovesPanel';
import FixedElement from 'client/components/FixedElement';
import Chat from 'client/components/Chat';
import Boards from 'client/components/Boards';

import GamePlayer from './GamePlayer';
import GameInfo from './GameInfo';
import GameActions from './GameActions';
import GamePiece from './GamePiece';
import PromotionModal from './PromotionModal';

import './index.less';

interface OwnProps {
  game: GameHelper;

  children?: React.ReactNode;
  contentChildren?: React.ReactNode;
  className?: string;

  showBoard?: boolean;
  showPlayers?: boolean;
  showMovesPanel?: boolean;
  showChat?: boolean;
  showActions?: boolean;
  showInfo?: boolean;
  boardsWidth?: number;
}

type Props = OwnProps & ReturnType<typeof mapStateToProps>;

interface State {
  selectedPiece: RealPiece | null;
  selectedPieceBoard: number;
  allowedMoves: BoardPossibleMove[];
  drawingSymbolStart: Square | null;
  drawingSymbol: DrawnSymbol | null;
  drawnSymbols: DrawnSymbol[];
  promotionModalVisible: boolean;
  promotionMove: BaseMove | null;
  validPromotions: readonly PieceTypeEnum[];
  isDragging: boolean;
}

const INPUT_ELEMENTS = ['input', 'textarea'];

class Game extends React.Component<Props, State> {
  static defaultProps = {
    showBoard: true,
    showPlayers: false,
    showMovesPanel: false,
    showChat: false,
    showActions: false,
    showInfo: false,
    boardsWidth: 0,
  };

  draggingPieceRef = React.createRef<SVGSVGElement>();
  draggingPieceTranslate: string = 'none';
  prevMoveIndex = -1;
  prevMoveCount = 0;
  drawnSymbolId = 0;
  drawnSymbolColor: DrawnSymbolColor = DrawnSymbolColor.GREEN;
  prevAllowedSquareElem: Element | null = null;
  state: State = {
    selectedPiece: null,
    selectedPieceBoard: 0,
    allowedMoves: [],
    drawingSymbolStart: null,
    drawingSymbol: null,
    drawnSymbols: [],
    promotionModalVisible: false,
    promotionMove: null,
    validPromotions: [],
    isDragging: false,
  };

  componentDidMount() {
    this.addGameListeners();

    document.addEventListener('mousemove', this.drag);
    document.addEventListener('touchmove', this.drag, { passive: false });
    document.addEventListener('mouseup', this.endDrag);
    document.addEventListener('touchend', this.endDrag);
    document.addEventListener('keydown', this.onKeyDown);
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.game !== this.props.game) {
      this.removeGameListeners();
      this.addGameListeners();
    }
  }

  componentWillUnmount() {
    this.removeGameListeners();

    document.removeEventListener('mousemove', this.drag);
    document.removeEventListener('touchmove', this.drag);
    document.removeEventListener('mouseup', this.endDrag);
    document.removeEventListener('touchend', this.endDrag);
    document.removeEventListener('keydown', this.onKeyDown);
  }

  addGameListeners() {
    const {
      game,
    } = this.props;

    this.prevMoveIndex = game.currentMoveIndex;
    this.prevMoveCount = game.getUsedMoves().length;

    game.on('updateChat', this.onUpdateChat);
    game.on('updateGame', this.onUpdateGame);
  }

  removeGameListeners() {
    const {
      game,
    } = this.props;

    game.off('updateChat', this.onUpdateChat);
    game.off('updateGame', this.onUpdateGame);
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
    const sameColor = existingIndex !== -1 && drawnSymbols[existingIndex].color === drawnSymbol.color;

    return existingIndex === -1
      ? [...drawnSymbols, drawnSymbol]
      : [
        ...drawnSymbols.slice(0, existingIndex),
        ...(sameColor ? [] : [drawnSymbol]),
        ...drawnSymbols.slice(existingIndex + 1),
      ];
  }

  getBoardPiece(square: Square): BoardPiece | null | false {
    const {
      game,
    } = this.props;

    return game.getBoardPiece(square) || (
      this.props.showFantomPieces
      && game.getBoardPiece({ ...square, board: game.getPrevBoard(square.board) })
    );
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
      game,
      boardsWidth = 0,
    } = this.props;
    const boardWidth = Math.max(
      game.boardToShow === 'all'
        ? (boardsWidth - (game.boardCount - 1) * ALICE_CHESS_BOARDS_MARGIN) / game.boardCount
        : boardsWidth,
      0,
    );

    return game.getPieceSize() * boardWidth / (2 * game.boardCenterX);
  }

  isAbleToMove(): boolean {
    const {
      game,
    } = this.props;

    return (
      !!game.player
      // TODO: replace true with premovesEnabled
      && (game.player.color === game.turn || true)
      && game.status === GameStatusEnum.ONGOING
      && game.currentMoveIndex === game.getUsedMoves().length - 1
    );
  }

  onKeyDown = (e: KeyboardEvent) => {
    const {
      game,
    } = this.props;

    if (!e.target || !INPUT_ELEMENTS.includes((e.target as HTMLElement).tagName.toLowerCase())) {
      let preventDefault = true;

      if (e.key === 'ArrowLeft') {
        game.moveBack();
      } else if (e.key === 'ArrowRight') {
        game.moveForward(true, true);
      } else if (e.key === 'ArrowUp') {
        game.navigateToMove(-1);
      } else if (e.key === 'ArrowDown') {
        game.navigateToMove(game.getUsedMoves().length - 1);
      } else if (e.key === '1' || e.key === '2') {
        if (game.boardToShow !== 'all') {
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

  onUpdateChat = () => {
    this.forceUpdate();
  };

  onUpdateGame = () => {
    const {
      game,
    } = this.props;

    if (
      this.prevMoveCount - this.prevMoveIndex !== game.getUsedMoves().length - game.currentMoveIndex
      && this.prevMoveIndex !== game.currentMoveIndex
    ) {
      game.cancelPremoves(false);

      this.setState({
        selectedPiece: null,
        allowedMoves: [],
        isDragging: false,
        drawingSymbolStart: null,
        drawingSymbol: null,
        drawnSymbols: [],
      });
    } else if (
      this.state.selectedPiece
      && this.prevMoveCount !== game.getUsedMoves().length
      && game.player
      && game.turn === game.player.color
    ) {
      this.setState({
        allowedMoves: this.getAllowedMoves(this.state.selectedPiece, this.state.selectedPieceBoard).toArray(),
      });
    } else {
      this.forceUpdate();
    }

    this.prevMoveIndex = game.currentMoveIndex;
    this.prevMoveCount = game.getUsedMoves().length;
  };

  sendMessage = (message: string) => {
    this.props.game.sendMessage(message);
  };

  selectPiece = (selectedPiece: RealPiece | null, selectedPieceBoard: number = 0) => {
    this.setState({
      selectedPiece,
      selectedPieceBoard,
      allowedMoves: selectedPiece
        ? this.getAllowedMoves(selectedPiece, selectedPieceBoard).toArray()
        : [],
      drawnSymbols: [],
    });
  };

  flipBoard = () => {
    this.props.game.toggleIsBlackBase(true);
  };

  switchBoard = (boardToShow: number) => {
    this.props.game.setBoardToShow(boardToShow);
  };

  toggleShowDarkChessHiddenPieces = () => {
    this.props.game.toggleShowDarkChessHiddenPieces();
  };

  setBoardsShiftX = (boardsShiftX: number) => {
    this.props.game.setBoardsShiftX(boardsShiftX);
  };

  getAllowedMoves = function* (
    this: Game,
    selectedPiece: RealPiece,
    selectedPieceBoard: number,
  ): Generator<BoardPossibleMove, any, any> {
    const {
      game,
    } = this.props;

    if (!game.player) {
      return;
    }

    const moves = game.player.color === game.turn
      ? game.getAllowedMoves(selectedPiece)
      : game.getPossibleMoves(selectedPiece, GetPossibleMovesMode.PREMOVES);
    const allowedMoves = moves
      .map((square) => ({
        square: {
          ...square,
          board: GameHelper.isPocketPiece(selectedPiece)
            ? square.board
            : selectedPieceBoard,
        },
        realSquare: square,
      }))
      .toArray();

    yield* allowedMoves;

    // add own rooks as castling move targets
    if (!game.is960) {
      for (const move of allowedMoves) {
        const castlingRook = game.getCastlingRook(selectedPiece, move.realSquare);

        if (castlingRook) {
          yield {
            ...move,
            square: {
              ...castlingRook.location,
              board: selectedPieceBoard,
            },
            realSquare: move.realSquare,
          };
        }
      }
    }
  }.bind(this);

  makeMove = (square: Square) => {
    const {
      game,
    } = this.props;
    const {
      selectedPiece,
      selectedPieceBoard,
      allowedMoves,
    } = this.state;

    if (!selectedPiece) {
      this.setState({
        isDragging: false,
      });

      return;
    }

    // TODO: if dnd only this if should not be run
    if (
      GameHelper.isBoardPiece(selectedPiece)
      && GameHelper.areSquaresEqual({ ...selectedPiece.location, board: selectedPieceBoard }, square)
    ) {
      this.setState({
        isDragging: false,
      });

      return;
    }

    if (!game.player) {
      return;
    }

    const isPremove = game.player.color !== game.turn;
    const allowedMove = allowedMoves.find(({ square: allowedSquare }) => GameHelper.areSquaresEqual(square, allowedSquare));
    const resetGameState = {
      isDragging: false,
      selectedPiece: null,
      allowedMoves: [],
    };

    if (!allowedMove) {
      this.setState(resetGameState);

      return;
    }

    const move: BaseMove = {
      from: selectedPiece.location,
      to: allowedMove.realSquare,
    };
    const isPawnPromotion = game.isPromoting(selectedPiece, allowedMove.realSquare);
    const validPromotions = isPawnPromotion && !isPremove
      ? game.validPromotions.filter((promotion) => (
        game.isMoveAllowed(selectedPiece, allowedMove.realSquare, promotion)
      ))
      : [];

    if (isPawnPromotion && validPromotions.length > 1) {
      this.setState({
        ...resetGameState,
        promotionModalVisible: true,
        promotionMove: move,
        validPromotions,
      });
    } else {
      game.move(
        isPawnPromotion
          ? { ...move, promotion: isPremove ? PieceTypeEnum.QUEEN : validPromotions[0] }
          : move,
      );

      this.setState(resetGameState);
    }
  };

  closePromotionPopup = () => {
    this.setState({
      promotionModalVisible: false,
      promotionMove: null,
    });
  };

  promoteToPiece = (pieceType: PieceTypeEnum) => {
    this.props.game.move({
      ...this.state.promotionMove!,
      promotion: pieceType,
    });

    this.closePromotionPopup();
  };

  onSquareClick = (square: Square) => {
    const {
      game,
      isTouchDevice,
    } = this.props;
    const {
      selectedPiece,
      selectedPieceBoard,
      allowedMoves,
    } = this.state;
    const enableDnd = true;

    if (!this.isAbleToMove()) {
      this.setState({
        drawnSymbols: [],
      });

      return;
    }

    const playerColor = game.player ? game.player.color : null;

    if (!selectedPiece) {
      const pieceInSquare = this.getBoardPiece(square);

      if (!pieceInSquare || playerColor !== pieceInSquare.color) {
        if (isTouchDevice) {
          game.cancelPremoves(true);
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
          game.cancelPremoves(false);
        }

        return this.selectPiece(null);
      }

      return this.selectPiece(pieceInSquare, square.board);
    }

    this.makeMove(square);
  };

  startDrag = (e: React.MouseEvent | React.TouchEvent, location: RealPieceLocation) => {
    const {
      game,
      isTouchDevice,
    } = this.props;

    if (
      e.type === 'mousedown'
      && !isTouchDevice
      && (e as React.MouseEvent).button === 2
      && location.type === PieceLocationEnum.BOARD
    ) {
      if (game.premoves.length) {
        game.cancelPremoves(false);

        this.setState({
          selectedPiece: null,
          allowedMoves: [],
        });
      } else {
        e.preventDefault();

        this.setState({
          selectedPiece: null,
          allowedMoves: [],
          isDragging: true,
          drawingSymbolStart: location,
          drawingSymbol: {
            type: 'circle',
            color: this.drawnSymbolColor = e.ctrlKey
              ? DrawnSymbolColor.BLUE
              : e.shiftKey
                ? DrawnSymbolColor.RED
                : e.altKey
                  ? DrawnSymbolColor.YELLOW
                  : DrawnSymbolColor.GREEN,
            id: ++this.drawnSymbolId,
            square: location,
          },
        });
      }

      return;
    }

    if ((e.type === 'mousedown' && (isTouchDevice || (e as React.MouseEvent).button !== 0)) || !this.isAbleToMove()) {
      return;
    }

    const draggedPiece = location.type === PieceLocationEnum.BOARD
      ? this.getBoardPiece(location)
      : game.getPocketPiece(location.pieceType, location.color);

    if (
      draggedPiece
      && draggedPiece.color === game.player?.color
      && (
        !GameHelper.isBoardPiece(draggedPiece)
        || this.state.allowedMoves.every(({ square }) => !GameHelper.areSquaresEqual(draggedPiece.location, square))
      )
    ) {
      e.preventDefault();

      this.draggingPieceTranslate = this.getDraggingPieceTranslate(e);

      const selectedPieceBoard = location.type === PieceLocationEnum.POCKET ? 0 : location.board;

      this.setState({
        selectedPiece: draggedPiece,
        selectedPieceBoard,
        allowedMoves: this.getAllowedMoves(draggedPiece, selectedPieceBoard).toArray(),
        drawingSymbolStart: null,
        drawingSymbol: null,
        drawnSymbols: [],
        isDragging: true,
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

    e.preventDefault();

    const point = this.getEventPoint(e);
    let squareElem: Element | null = null;
    let square: Square | null = null;

    const element = document.elementFromPoint(point.x, point.y);

    if (element && (element instanceof SVGPathElement || element instanceof SVGRectElement) && element.dataset.square) {
      try {
        square = JSON.parse(element.dataset.square);

        if (element.classList.contains('allowed-square')) {
          squareElem = element;
        }
      } catch {
        /* empty */
      }
    }

    if (this.state.drawingSymbolStart) {
      this.setState(({ drawingSymbolStart, drawingSymbol }) => {
        if (!drawingSymbolStart) {
          return null;
        }

        const newDrawingSymbol: DrawnSymbol | null | false = square && drawingSymbolStart.board === square.board && (
          GameHelper.areSquaresEqual(drawingSymbolStart, square)
            ? { type: 'circle', color: this.drawnSymbolColor, id: this.drawnSymbolId, square: drawingSymbolStart }
            : { type: 'arrow', color: this.drawnSymbolColor, id: this.drawnSymbolId, from: drawingSymbolStart, to: square }
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
          drawingSymbol: newDrawingSymbol || null,
        };
      });
    } else {
      if (this.prevAllowedSquareElem !== squareElem) {
        if (this.prevAllowedSquareElem) {
          this.prevAllowedSquareElem.classList.remove('hover');
        }

        if (squareElem) {
          squareElem.classList.add('hover');
        }

        this.prevAllowedSquareElem = squareElem;
      }

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
          : drawnSymbols,
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
            && element instanceof HTMLDivElement
            && element.dataset.pocketPiece === this.state.selectedPiece.location.pieceType
          ) {
            this.setState({
              isDragging: false,
            });

            return true;
          }

          if (!(element instanceof SVGPathElement) && !(element instanceof SVGRectElement)) {
            return false;
          }

          const squareJSON = element.dataset.square;

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
        allowedMoves: [],
      });
    }
  };

  render() {
    const {
      className,
      children,
      contentChildren,
      game,
      showBoard,
      showPlayers,
      showMovesPanel,
      showChat,
      showActions,
      showInfo,
    } = this.props;
    const {
      player,
      status,
      pieces,
      piecesBeforePremoves,
      piecesWorth,
      chat,
      players,
      turn,
      isDarkChess,
      drawOffer,
      takebackRequest,
      timeControl,
      result,
      startingMoveIndex,
      isBlackBase,
      boardsShiftX,
      boardToShow,
      darkChessMode,
      showDarkChessHiddenPieces,
      lastMoveTimestamp,
      currentMoveIndex,
      premoves,
    } = game;
    const {
      selectedPiece,
      isDragging,
    } = this.state;
    const usedMoves = game.getUsedMoves();
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
    const usedPieces = darkChessMode && !showDarkChessHiddenPieces && !premoves.length
      ? game.getMoveVisiblePieces(currentMoveIndex, darkChessMode)
      : pieces;
    const isMaterialDiffShown = game.isMaterialDiffShown();
    const materialDifference: EachPieceType<number> = {} as any;
    let allMaterialDifference = 0;

    if (isMaterialDiffShown) {
      const actualPieces = premoves.length
        ? piecesBeforePremoves
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

        allMaterialDifference += diff * piecesWorth[pieceType];
      });
    }

    return (
      <div
        className={classNames('game', className)}
        id={`game-${game.id}`}
        style={{
          '--pocket-size': game.pocketPiecesUsed.length,
        } as React.CSSProperties}
      >
        <div className="game-content">
          {showActions && (
            <GameActions
              game={game}
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
              toggleShowDarkChessHiddenPieces={this.toggleShowDarkChessHiddenPieces}
              setBoardsShiftX={this.setBoardsShiftX}
            />
          )}

          {showBoard && (
            <Boards
              game={game}
              pieces={usedPieces}
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
              currentMoveIndex={currentMoveIndex}
              boardsShiftX={boardsShiftX}
              showKingAttack={!premoves.length && (!isDarkChess || showDarkChessHiddenPieces)}
            />
          )}

          {showPlayers && _.map(players, (panelPlayer) => (
            <GamePlayer
              key={panelPlayer.id}
              game={game}
              player={panelPlayer}
              playingPlayer={player}
              pieces={pieces}
              moves={usedMoves}
              timeControl={timeControl}
              turn={turn}
              realTurn={realTurn}
              status={status}
              currentMoveIndex={currentMoveIndex}
              lastMoveTimestamp={lastMoveTimestamp}
              enableClick={enableClick && !!player && panelPlayer.id === player.id}
              enableDnd={enableDnd && !!player && panelPlayer.id === player.id}
              isTop={panelPlayer.id === topPlayer.id}
              isMaterialDiffShown={isMaterialDiffShown}
              allMaterialDifference={allMaterialDifference}
              materialDifference={materialDifference}
              selectedPiece={
                selectedPiece && selectedPiece.color === panelPlayer.color && GameHelper.isPocketPiece(selectedPiece)
                  ? selectedPiece
                  : null
              }
              selectPiece={this.selectPiece}
              startDraggingPiece={this.startDrag}
            />
          ))}

          {showMovesPanel && (
            <MovesPanel
              game={game}
              currentMoveIndex={currentMoveIndex}
              moves={usedMoves}
            />
          )}

          <PromotionModal
            game={game}
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
                  transform: this.draggingPieceTranslate,
                }}
              >
                <GamePiece
                  piece={selectedPiece}
                  pieceSize={pieceSize}
                />
              </svg>
            </FixedElement>
          )}

          {contentChildren}
        </div>

        {showInfo && (
          <GameInfo
            game={game}
            result={result}
          />
        )}

        {showChat && (
          <Chat
            chat={chat}
            sendMessage={this.sendMessage}
          />
        )}

        {children}
      </div>
    );
  }
}

function mapStateToProps(state: ReduxState) {
  return {
    isTouchDevice: state.common.isTouchDevice,
    showFantomPieces: state.gameSettings.showFantomPieces,
  };
}

export default connect(mapStateToProps)(Game);
