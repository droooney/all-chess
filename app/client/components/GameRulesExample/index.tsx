import * as React from 'react';

import {
  GameVariantEnum
} from '../../../types';
import {
  GAME_VARIANT_PGN_NAMES
} from '../../../shared/constants';
import { Game } from '../../helpers';

import Boards from '../Boards';
import MovesPanel from '../MovesPanel';

interface OwnProps {
  id: string;
  description: string | JSX.Element;
  variants: GameVariantEnum[];
  boardCount: number;
  boardWidth: number;
  boardHeight: number;

  fen?: string;
  moves?: string;
  startingMoveIndex?: number;
}

type Props = OwnProps;

export default class GameRulesExample extends React.Component<Props> {
  static defaultProps = {
    boardCount: 1,
    boardWidth: 8,
    boardHeight: 8
  };

  game: Game;

  constructor(props: Props) {
    super(props);

    const variantsString = props.variants.length
      ? props.variants.map((variant) => GAME_VARIANT_PGN_NAMES[variant]).join(' + ')
      : 'Standard';

    this.game = Game.getGameFromPgn(`
      ${props.fen ? `[FEN "${props.fen}"]` : ''}
      [Variant "${variantsString}"]

      ${props.moves || ''}
    `);

    if ('startingMoveIndex' in props) {
      this.game.navigateToMove(props.startingMoveIndex || 0);
    }

    this.game.on('updateGame', () => {
      this.forceUpdate();
    });
  }

  render() {
    const {
      id,
      description,
      moves
    } = this.props;

    return (
      <div className="game-rules-example" id={`example-${id}`}>
        <div className="boards-description-container">
          <Boards
            game={this.game}
            player={null}
            selectedPiece={null}
            selectPiece={() => {}}
            startDraggingPiece={() => {}}
            makeMove={() => {}}
            enableClick={false}
            enableDnd={false}
            darkChessMode={null}
            isBlackBase={false}
            isDragging={false}
            currentMove={this.game.moves[this.game.currentMoveIndex]}
            squareSize={this.game.getSquareSize() / 2}
            boardsShiftX={0}
            pieces={this.game.pieces}
          />
          <div className="description">
            {description}
          </div>
        </div>
        {moves && (
          <MovesPanel
            game={this.game}
            currentMoveIndex={this.game.currentMoveIndex}
            moves={this.game.getUsedMoves()}
          />
        )}
      </div>
    );
  }
}
