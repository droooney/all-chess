import * as qs from 'querystring';
import * as _ from 'lodash';
import * as React from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { Game } from '../../helpers';
import { Game as BaseGame } from '../../../shared/helpers';
import {
  BoardPiece,
  GameVariantEnum,
  Piece,
  PieceLocationEnum,
  RealPiece,
  RealPieceLocation,
  Square
} from '../../../types';
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
  dragX = 0;
  dragY = 0;
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

    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  componentWillUnmount() {
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  }

  componentDidUpdate(prevProps: Props, prevState: State): void {
    if (!prevState.isDragging && this.state.isDragging) {
      document.body.classList.add('dragging');
    } else if (prevState.isDragging && !this.state.isDragging) {
      document.body.classList.remove('dragging');
    }

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

  getSquareSize(): number {
    return this.game.getSquareSize() * 0.75;
  }

  getPieceSize() {
    return this.game.getPieceSize(this.getSquareSize());
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
      this.dragX = e.pageX;
      this.dragY = e.pageY;

      this.setState({
        selectedPiece: draggedPiece,
        isDragging: true
      });
    }
  };

  makeMove = (square: Square | null) => {
    const {
      selectedPiece
    } = this.state;

    if (!selectedPiece) {
      return;
    }

    if (
      Game.isBoardPiece(selectedPiece)
      && square
      && Game.areSquaresEqual(selectedPiece.location, square)
    ) {
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

    if (selectedPiece.location.type === PieceLocationEnum.BOARD) {
      this.game.boards[selectedPiece.location.board][selectedPiece.location.y][selectedPiece.location.x] = null;
    }

    if (square) {
      this.game.boards[square.board][square.y][square.x] = selectedPiece as BoardPiece;
    }

    (selectedPiece as Piece).location = square && {
      ...square,
      type: PieceLocationEnum.BOARD
    };

    this.selectPiece(null);
    this.replaceQuery();
  };

  onMouseMove = (e: MouseEvent) => {
    if (!this.state.isDragging) {
      return;
    }

    const pieceSize = this.getPieceSize();

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
    const squareSize = this.getSquareSize();
    const pieceSize = this.getPieceSize();

    return (
      <div className="route board-editor-route">

        <DocumentTitle value="AllChess - Board editor" />

        <Boards
          game={this.game}
          player={null}
          selectedPiece={selectedPiece}
          selectPiece={this.selectPiece}
          startDraggingPiece={this.startDraggingPiece}
          makeMove={this.makeMove}
          enableClick={false}
          enableDnd
          darkChessMode={null}
          isBlackBase={false}
          isDragging={isDragging}
          currentMove={undefined}
          squareSize={squareSize}
          boardsShiftX={0}
          pieces={this.game.pieces}
          showKingAttack={false}
          forceMoveWithClick
          getAllowedMoves={function* () {}}
        />

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
}

export default BoardEditor;
