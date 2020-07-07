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

import './index.less';

interface OwnProps {
  id: string;
  description: string;
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
    `, props.id);

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
        <Boards
          game={this.game}
          player={null}
          selectedPiece={null}
          selectedPieceBoard={0}
          allowedMoves={[]}
          premoves={[]}
          drawnSymbols={[]}
          onSquareClick={() => {}}
          startDraggingPiece={() => {}}
          enableClick={false}
          enableDnd={false}
          darkChessMode={null}
          isBlackBase={false}
          isDragging={false}
          currentMoveIndex={this.game.currentMoveIndex}
          boardToShow="all"
          boardsShiftX={0}
          pieces={this.game.pieces}
        />
        <div className="description">
          {description}
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
