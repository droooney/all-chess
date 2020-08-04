import * as React from 'react';
import classNames from 'classnames';

import {
  GAME_VARIANT_PGN_NAMES,
} from 'shared/constants';

import {
  GameVariantEnum,
} from 'shared/types';

import { Game as GameHelper } from 'client/helpers';

import Game from 'client/components/Game';

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
    boardHeight: 8,
  };

  game: GameHelper;

  constructor(props: Props) {
    super(props);

    const variantsString = props.variants.length
      ? props.variants.map((variant) => GAME_VARIANT_PGN_NAMES[variant]).join(' + ')
      : 'Standard';

    this.game = GameHelper.getGameFromPgn(`
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
      description,
      moves,
    } = this.props;

    return (
      <Game
        className={classNames('game-rules-example', { 'with-moves': !!moves })}
        game={this.game}
        showMovesPanel={!!moves}
        contentChildren={
          <div className="description">
            {description}
          </div>
        }
      />
    );
  }
}
