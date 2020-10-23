import classNames from 'classnames';
import * as React from 'react';

import { GAME_VARIANT_PGN_NAMES } from 'shared/constants';

import { ColorEnum, DrawnSymbolColor, DrawnSymbolType, GameVariantEnum, PocketPiece } from 'shared/types';

import { Game as GameHelper } from 'client/helpers';

import Game from 'client/components/Game';
import PlayerPocket from 'client/components/PlayerPocket';

import './index.less';

interface OwnProps {
  id: string;
  description: string;
  variants: GameVariantEnum[];

  fen?: string;
  moves?: string;
  symbols?: string[][];
  startBoardsFile?: string;
  darkChessMode?: ColorEnum | null;
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
      startBoardsFile,
      darkChessMode,
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

    if (startBoardsFile) {
      game.setBoardsShiftX(-GameHelper.getFileNumber(startBoardsFile));
    }

    if (symbols) {
      let symbolId = 0;

      symbols.forEach((positionSymbols, index) => {
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
      });

      game.navigateToMove(-1);
    }

    if (darkChessMode) {
      game.changeDarkChessMode(darkChessMode);
    }

    game.on('updateGame', () => {
      this.forceUpdate();
    });

    gameRef?.(this.game);
  }

  render() {
    const {
      id,
      description,
      moves,
    } = this.props;
    const game = this.game;

    return (
      <Game
        className={classNames('rules-example', {
          'with-moves': !!moves,
          'with-pocket': game.isPocketUsed,
        })}
        game={game}
        useKeyboard={false}
        showMovesPanel={!!moves}
        contentChildren={
          <React.Fragment>
            <div className="description">
              Example {id}. {description}
            </div>

            {game.isPocketUsed && (
              Object.values(ColorEnum).map((color) => (
                <PlayerPocket
                  key={color}
                  className={`pocket-${color}`}
                  game={game}
                  color={color}
                  pocket={game.pieces.filter(
                    (piece) => GameHelper.isPocketPiece(piece) && piece.color === color,
                  ) as PocketPiece[]}
                  enableClick={false}
                  enableDnd={false}
                  selectedPiece={null}
                  selectPiece={() => {}}
                  startDraggingPiece={() => {}}
                />
              ))
            )}
          </React.Fragment>
        }
        movesPanelType="text"
      />
    );
  }
}
