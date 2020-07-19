import * as qs from 'querystring';
import * as _ from 'lodash';
import * as React from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { Game } from 'client/helpers';
import { Game as BaseGame } from '../../../shared/helpers';
import {
  BoardPiece,
  GameVariantEnum,
  Piece,
  PieceLocationEnum,
  RealPiece,
  RealPieceLocation,
  Square
} from 'shared/types';
import { STANDARD_FEN } from '../../constants';
import { GAME_VARIANT_PGN_NAMES } from '../../../shared/constants';

import Boards from '../Boards';
import DocumentTitle from '../DocumentTitle';
import FixedElement from '../FixedElement';
import GamePiece from '../GamePiece';

type Props = RouteComponentProps<any>;

interface State {
  selectedPiece: RealPiece | null;
  isDragging: boolean;
}

class BoardEditor extends React.Component<Props, State> {
  draggingPieceRef = React.createRef<SVGSVGElement>();
  draggingPieceTranslate: string = 'none';
  game = this.getStandardGame();
  queryChangedFromOutside = true;
  state: State = {
    selectedPiece: null,
    isDragging: false
  };

  componentDidMount() {
    const game = this.getGameFromFen();

    if (game) {
      this.game = game;

      this.forceUpdate();
    }

    setTimeout(this.replaceQuery, 0);

    document.addEventListener('mousemove', this.dragPiece);
    document.addEventListener('touchmove', this.dragPiece, { passive: false });
    document.addEventListener('mouseup', this.endDraggingPiece);
    document.addEventListener('touchend', this.endDraggingPiece);
  }

  componentWillUnmount() {
    document.removeEventListener('mousemove', this.dragPiece);
    document.removeEventListener('touchmove', this.dragPiece);
    document.removeEventListener('mouseup', this.endDraggingPiece);
    document.removeEventListener('touchend', this.endDraggingPiece);
  }

  componentDidUpdate(prevProps: Props): void {
    if (
      this.props.location.search !== prevProps.location.search
      && this.queryChangedFromOutside
    ) {
      const game = this.getGameFromFen();

      if (game) {
        this.game = game;

        this.forceUpdate();
      }

      this.replaceQuery();
    }

    this.queryChangedFromOutside = true;
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

  getStandardGame(): Game {
    return new Game({
      game: new BaseGame({
        startingData: Game.getStartingDataFromFen(STANDARD_FEN, []),
        timeControl: null,
        variants: [],
        id: ''
      })
    });
  }

  getGameFromFen(): Game | null {
    const {
      fen,
      variants: variantsString
    } = this.getQuery();

    if (!fen) {
      return null;
    }

    const variants = variantsString
      .split('+')
      .map((variant) => _.findKey(GAME_VARIANT_PGN_NAMES, (pgnName) => pgnName === variant))
      .filter(Boolean) as GameVariantEnum[];

    if (!Game.validateVariants(variants)) {
      return null;
    }

    try {
      return new Game({
        game: new BaseGame({
          startingData: Game.getStartingDataFromFen(fen, []),
          timeControl: null,
          variants,
          id: ''
        })
      });
    } catch (err) {
      return null;
    }
  }

  getQuery(): { fen: string | null; variants: string; } {
    const {
      location
    } = this.props;
    const query = qs.parse(location.search.slice(1));

    return {
      fen: query.fen ? `${query.fen}` : null,
      variants: query.variants ? `${query.variants}` : ''
    };
  }

  getPieceSize() {
    return 100;
  }

  replaceQuery = () => {
    const {
      history
    } = this.props;

    this.queryChangedFromOutside = false;

    history.replace({
      pathname: '/editor',
      search: `?${qs.stringify({
        fen: this.game.getFen(),
        variants: this.game.variants.map((variant) => GAME_VARIANT_PGN_NAMES[variant]).join('+')
      })}`
    });
  };

  selectPiece = (selectedPiece: RealPiece | null) => {
    this.setState({
      selectedPiece
    });
  };

  startDraggingPiece = (e: React.MouseEvent, location: RealPieceLocation) => {
    const draggedPiece = location.type === PieceLocationEnum.BOARD
      ? this.game.getBoardPiece(location)
      : this.game.getPocketPiece(location.pieceType, location.color);

    if (draggedPiece) {
      this.draggingPieceTranslate = this.getDraggingPieceTranslate(e);

      this.setState({
        selectedPiece: draggedPiece,
        isDragging: true
      });
    }
  };

  onSquareClick = (square: Square) => {
    const {
      selectedPiece
    } = this.state;

    if (selectedPiece) {
      this.makeMove(square);
    } else {
      this.selectPiece(this.game.getBoardPiece(square));
    }
  };

  makeMove = (square: Square | null) => {
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
    if (
      Game.isBoardPiece(selectedPiece)
      && square
      && Game.areSquaresEqual(selectedPiece.location, square)
    ) {
      this.setState({
        isDragging: false
      });

      return;
    }

    const existingPiece = square
      ? this.game.getBoardPiece(square)
      : selectedPiece;
    const pieceIndex = this.game.pieces.indexOf(existingPiece!);
    let pieces: Piece[];

    if (existingPiece && pieceIndex !== -1) {
      pieces = [
        ...this.game.pieces.slice(0, pieceIndex),
        ...this.game.pieces.slice(pieceIndex + 1)
      ];
    } else {
      pieces = [...this.game.pieces];
    }

    this.game.pieces = pieces;

    if (Game.isBoardPiece(selectedPiece)) {
      this.game.boards[selectedPiece.location.board][selectedPiece.location.y][selectedPiece.location.x] = null;
    }

    if (square) {
      this.game.boards[square.board][square.y][square.x] = selectedPiece as BoardPiece;
    }

    (selectedPiece as Piece).location = square && {
      ...square,
      type: PieceLocationEnum.BOARD
    };

    this.setState({
      isDragging: false,
      selectedPiece: null
    });
    this.replaceQuery();
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

    this.setState({
      isDragging: false
    });

    const point = this.getEventPoint(e);

    if (
      !document.elementsFromPoint(point.x, point.y).some((element) => {
        try {
          if (
            this.state.selectedPiece
            && Game.isPocketPiece(this.state.selectedPiece)
            && (element as HTMLElement).dataset.pocketPiece === this.state.selectedPiece.location.pieceType
          ) {
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
      this.makeMove(null);
    }
  };

  render() {
    const {
      selectedPiece,
      isDragging
    } = this.state;

    return (
      <div className="route board-editor-route">
        <DocumentTitle value="AllChess - Board editor" />

        <Boards
          game={this.game}
          player={null}
          selectedPiece={selectedPiece}
          selectedPieceBoard={selectedPiece && Game.isBoardPiece(selectedPiece) ? selectedPiece.location.board : 0}
          allowedMoves={[]}
          premoves={[]}
          drawnSymbols={[]}
          onSquareClick={this.onSquareClick}
          startDraggingPiece={this.startDraggingPiece}
          enableClick
          enableDnd
          darkChessMode={null}
          isBlackBase={false}
          isDragging={isDragging}
          currentMoveIndex={-1}
          boardToShow="all"
          boardsShiftX={0}
          pieces={this.game.pieces}
          showKingAttack={false}
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
                pieceSize={this.getPieceSize()}
              />
            </svg>
          </FixedElement>
        )}
      </div>
    );
  }
}

export default BoardEditor;
