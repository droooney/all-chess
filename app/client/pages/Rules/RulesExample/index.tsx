import * as React from 'react';
import classNames from 'classnames';

import { GAME_VARIANT_PGN_NAMES } from 'shared/constants';

import { DrawnSymbolColor, DrawnSymbolType, GameVariantEnum } from 'shared/types';

import { Game as GameHelper } from 'client/helpers';

import Game from 'client/components/Game';

import './index.less';

interface OwnProps {
  id: string;
  description: string;
  variants: GameVariantEnum[];

  fen?: string;
  moves?: string;
  symbols?: (string[] | null | undefined)[];
  gameRef?(game: GameHelper): void;
}

type Props = OwnProps;

const SYMBOL_REGEX = /^([a-z]\d+)(?:->([a-z]\d+))?(?::([grby]))?$/;
const SYMBOL_COLORS: Partial<Record<string, DrawnSymbolColor>> = {
  g: DrawnSymbolColor.GREEN,
  r: DrawnSymbolColor.RED,
  b: DrawnSymbolColor.BLUE,
  y: DrawnSymbolColor.YELLOW,
};

export default class RulesExample extends React.Component<Props> {
  game: GameHelper;

  constructor(props: Props) {
    super(props);

    const {
      id,
      variants,
      fen,
      moves,
      symbols,
      gameRef,
    } = props;
    const variantsString = variants.length
      ? variants.map((variant) => GAME_VARIANT_PGN_NAMES[variant]).join(' + ')
      : 'Standard';

    const game = this.game = GameHelper.getGameFromPgn(`
      ${fen ? `[FEN "${fen}"]` : ''}
      [Variant "${variantsString}"]

      ${moves || ''}
    `, id);

    game.navigateToMove(-1);

    if (symbols) {
      let symbolId = 0;

      symbols.forEach((positionSymbols, index) => {
        if (positionSymbols) {
          game.navigateToMove(index - 1);

          positionSymbols.forEach((symbol) => {
            const match = symbol.match(SYMBOL_REGEX);

            if (match) {
              const [, fromSquareString, toSquareString, colorString] = match;
              const color = SYMBOL_COLORS[colorString] || DrawnSymbolColor.GREEN;
              const fromSquare = GameHelper.getSquare(fromSquareString);

              if (toSquareString) {
                game.addOrRemoveSymbol({
                  type: DrawnSymbolType.ARROW,
                  id: ++symbolId,
                  from: fromSquare,
                  to: GameHelper.getSquare(toSquareString),
                  color,
                });
              } else {
                game.addOrRemoveSymbol({
                  type: DrawnSymbolType.CIRCLE,
                  id: ++symbolId,
                  square: fromSquare,
                  color,
                });
              }
            } else {
              console.error(`Not parsed symbol: ${symbol}`);
            }
          });
        }
      });

      game.navigateToMove(-1);
    }

    game.on('updateGame', () => {
      this.forceUpdate();
    });

    gameRef?.(this.game);
  }

  render() {
    const {
      description,
      moves,
    } = this.props;

    return (
      <Game
        className={classNames('rules-example', { 'with-moves': !!moves })}
        game={this.game}
        useKeyboard={false}
        showMovesPanel={!!moves}
        contentChildren={
          <div className="description">
            {description}
          </div>
        }
        movesPanelType="text"
      />
    );
  }
}
