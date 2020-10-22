import React from 'react';

import { ColorEnum, GameVariantEnum } from 'shared/types';

import { Game } from 'client/helpers';

import GameVariantLink from 'client/components/GameVariantLink';

import RulesExampleLink from '../RulesExampleLink';
import RulesExample from '../RulesExample';
import Combinations from '../Combinations';
import Combination from '../Combination';
import Overview from '../Overview';
import Moves from '../Moves';
import GameEnd from '../GameEnd';
import Setup from '../Setup';

interface OwnProps {
  gameRef(game: Game): void;
}

type Props = OwnProps;

class TwoFamiliesRules extends React.PureComponent<Props> {
  render() {
    const {
      gameRef,
    } = this.props;

    return (
      <React.Fragment>
        <Overview>
          <p>
            Two Families is a variant in which each side has an additional king and a queen.
          </p>
        </Overview>

        <Setup>
          <p>
            The game is played on a 10x8 board and each side has one more king and queen.
          </p>

          <RulesExample
            id="1"
            description="Starting position in Two Families"
            variants={[GameVariantEnum.TWO_FAMILIES]}
          />
        </Setup>

        <Moves>
          <p>
            A move is legal if it doesn't leave any of the kings in check.
            If there are no such moves the game is over.
          </p>

          <section>
            <h3 id="castling">
              Castling
            </h3>

            Each king can castle only to its own side: the "e" king - with the "a" rook, the "g" king - with the "j" rook.
          </section>
        </Moves>

        <GameEnd>
          <p>
            If one side can't make a move without leaving their king(s) in check they lose.
            There are a few different looking wins in Two Families:

            <br />
            <br />

            - regular checkmate: one or both kings are checkmated

            <br />

            - forked kings (see <RulesExampleLink id="2" />)

            <br />

            - skewered kings (see <RulesExampleLink id="3" />)
          </p>

          <RulesExample
            id="2"
            description="Black loses because their kings are forked"
            variants={[GameVariantEnum.TWO_FAMILIES]}
            fen="k3k5/10/10/1N8/4KK4/10/10/10 w - - 0 43"
            moves="43. Nc7#"
            symbols={[
              ['b5->c7'],
            ]}
            gameRef={gameRef}
          />

          <RulesExample
            id="3"
            description="White loses because their kings are skewered"
            variants={[GameVariantEnum.TWO_FAMILIES]}
            fen="10/10/10/4kk4/10/4b5/1K8/K9 b - - 0 44"
            moves="44... Bd4#"
            symbols={[
              ['e3->d4'],
            ]}
            gameRef={gameRef}
          />
        </GameEnd>

        <Combinations>
          <p>
            Two families can be combined with any variant except <GameVariantLink variant={GameVariantEnum.CAPABLANCA} />.
          </p>

          <Combination variant={GameVariantEnum.ATOMIC}>
            <p>
              In Two Families + Atomic chess it's sufficient to explode only one king.
            </p>

            <RulesExample
              id="3"
              description="Two Families + Atomic chess win"
              variants={[GameVariantEnum.TWO_FAMILIES, GameVariantEnum.ATOMIC]}
              fen="r1bqkqkbnr/pppppppppp/10/6N3/3n6/2N7/PPPPPPPPPP/R1BQKQKB1R b KQkq - 5 3"
              moves="3... Nxe2#"
              symbols={[
                ['d4->e2'],
              ]}
              gameRef={gameRef}
            />
          </Combination>

          <Combination variant={GameVariantEnum.BENEDICT_CHESS}>
            <p>
              In Two Families + Benedict chess it's sufficient to flip only one king.
            </p>

            <RulesExample
              id="4"
              description="Two Families + Benedict chess win"
              variants={[GameVariantEnum.TWO_FAMILIES, GameVariantEnum.BENEDICT_CHESS]}
              fen="rnbqkqkbnr/ppppp1pppp/5p4/10/4P5/10/PPPP1PPPPP/RNBQKQKBNR w KQkq - 2 2"
              moves="2. Qc4#"
              symbols={[
                ['f1->c4'],
              ]}
              gameRef={gameRef}
            />
          </Combination>

          <Combination variant={GameVariantEnum.CIRCE}>
            <p>
              In Two Families + Circe when a queen is captured its return square is defined on which
              side of the board the capture was. The queen-side (a-e files) - d1/d8, the king-side (f-j files) - f1/f8.
            </p>

            <RulesExample
              id="5"
              description="After Qxc5 the black queen returns to d8; after the Qxf5 the white queen returns to f1"
              variants={[GameVariantEnum.TWO_FAMILIES, GameVariantEnum.CIRCE]}
              fen="rnb1k1kbnr/pppp1ppppp/10/2q1p2Q2/2Q1P2q2/10/PPPP1PPPPP/RNB1K1KBNR w KQkq - 6 4"
              moves="4. Qxc5 Qxh5"
              symbols={[
                ['c4->c5', 'c5->d8:b'],
                ['h4->h5', 'h5->f1:b'],
              ]}
              gameRef={gameRef}
            />
          </Combination>

          <Combination variant={GameVariantEnum.DARK_CHESS}>
            <p>
              In Two Families + Dark chess it's sufficient to capture only one king.
            </p>

            <RulesExample
              id="6"
              description="Two Families + Dark chess win"
              variants={[GameVariantEnum.TWO_FAMILIES, GameVariantEnum.DARK_CHESS]}
              fen="10/10/3k6/5k4/4K5/6K3/10/10 w - - 0 40"
              moves="40. Kxf5#"
              symbols={[
                ['e4->f5'],
              ]}
              darkChessMode={ColorEnum.WHITE}
              gameRef={gameRef}
            />
          </Combination>

          <Combination variant={GameVariantEnum.KING_OF_THE_HILL}>
            <p>
              In Two Families + King of the Hill it's sufficient to move only one king to the center.
            </p>

            <RulesExample
              id="7"
              description="Two Families + King of the Hill win"
              variants={[GameVariantEnum.TWO_FAMILIES, GameVariantEnum.KING_OF_THE_HILL]}
              fen="10/10/3k2k3/10/10/3K2K3/10/10 b - - 0 40"
              moves="40... Ke5#"
              symbols={[
                ['d6->e5'],
              ]}
              gameRef={gameRef}
            />
          </Combination>

          <Combination variant={GameVariantEnum.THREE_CHECK}>
            In Two Families + Three-check checking both kings at the same time still counts as one check.
          </Combination>
        </Combinations>
      </React.Fragment>
    );
  }
}

export default TwoFamiliesRules;
