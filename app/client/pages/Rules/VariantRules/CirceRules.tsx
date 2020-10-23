import React from 'react';

import { GameVariantEnum } from 'shared/types';

import { Game } from 'client/helpers';

import GameVariantLink from 'client/components/GameVariantLink';
import GameVariantLinks from 'client/components/GameVariantLinks';

import Combination from '../Combination';
import CombinationLinkSection from '../CombinationLinkSection';
import Combinations from '../Combinations';
import List from '../List';
import Moves from '../Moves';
import Overview from '../Overview';
import RulesExample from '../RulesExample';
import RulesExampleLink from '../RulesExampleLink';
import SpecialRules from '../SpecialRules';

interface OwnProps {
  gameRef(game: Game): void;
}

type Props = OwnProps;

class CirceRules extends React.PureComponent<Props> {
  render() {
    const {
      gameRef,
    } = this.props;

    return (
      <React.Fragment>
        <Overview>
          <p>
            Circe is a variant in which captured pieces may return to their starting positions.
          </p>
        </Overview>

        <Moves>
          <p>
            After the move if there was a piece captured it will return to the following square if it's empty:
          </p>

          <List elements={[
            <>if a queen was captured - the queen initial square (see <RulesExampleLink id="1" />)</>,
            <>
              if a rook/bishop/knight was captured - the square on the initial rank of the same piece type of the same
              color as the piece was captured on (see <RulesExampleLink id="2" />)
            </>,
            <>if a pawn was captured - the starting pawn square on the file it was captured on (see <RulesExampleLink id="3" />)</>,
            <>
              in <GameVariantLink variant={GameVariantEnum.CAPABLANCA} /> if an empress/cardinal was captured -
              the piece initial square (see <RulesExampleLink id="4" />)
            </>,
          ]} />

          <RulesExample
            id="1"
            description="After 8... Qxf3 the white queen returns to d1; after 9. Qxf3 the black doesn't returned to d8, as it's occupied"
            variants={[GameVariantEnum.CIRCE]}
            fen="2kr1bnr/ppp2ppp/2np1q2/1B2p3/4P3/3PBQ1P/PPP2PP1/RN3RK1 b - - 0 8"
            moves="8... Qxf3 9. Qxf3"
            symbols={[
              ['f6->f3', 'f3->d1:b'],
              ['d1->f3', 'f3->d8:r', 'd8:r'],
            ]}
            gameRef={gameRef}
          />

          <RulesExample
            id="2"
            description="After Bxc3 the white knight doesn't return to g2, as it's occupied; after bxc3 the black bishop returns to f8"
            variants={[GameVariantEnum.CIRCE]}
            fen="rnbqk1nr/pppp1ppp/8/4p3/1b2P3/P1N5/1PPP1PPP/R1BQKBNR b KQkq - 5 3"
            moves="3... Bxc3 4. bxc3"
            symbols={[
              ['b4->c3', 'c3->g1:r', 'g1:r'],
              ['b2->c3', 'c3->f8:b'],
            ]}
            gameRef={gameRef}
          />

          <RulesExample
            id="3"
            description="After exd4 the white d pawn returns to d2; after Nxd4 the black d pawn doesn't return to d7 as it's occupied"
            variants={[GameVariantEnum.CIRCE]}
            fen="r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq d3 5 3"
            moves="3... exd4 4. Nxd4"
            symbols={[
              ['e5->d4', 'd4->d2:b'],
              ['f3->d4', 'd4->d7:r', 'd7:r'],
            ]}
            gameRef={gameRef}
          />

          <RulesExample
            id="4"
            description="After Exg3 the white empress doesn't return to h1, as it's occupied; after Qxg3 the black empress returns to h8"
            variants={[GameVariantEnum.CIRCE, GameVariantEnum.CAPABLANCA]}
            fen="r1cbqkb1nr/ppppp1pppp/2n3e3/2B7/4pP4/6EN2/PPPPP1PPPP/RNCBQ2RK1 b kq - 13 7"
            moves="7... Exg3 8. Qxg3"
            symbols={[
              ['g6->g3', 'g3->h1:r', 'h1:r'],
              ['e1->g3', 'g3->h8:b'],
            ]}
            gameRef={gameRef}
          />
        </Moves>

        <SpecialRules>
          <p>
            Pawn moves (if it's not promotion) do not reset 50-move rule, as they are indirectly reversible.
            Also 50-move rule isn't reset if the captured piece returned.
          </p>
        </SpecialRules>

        <Combinations>
          <p>
            Circe can be combined with many variants. Exceptions are <GameVariantLinks variants={[
              GameVariantEnum.ANTICHESS, GameVariantEnum.ABSORPTION, GameVariantEnum.BENEDICT_CHESS,
              GameVariantEnum.CHESS_960, GameVariantEnum.HEXAGONAL_CHESS, GameVariantEnum.FRANKFURT,
            ]} />.
          </p>

          <Combination variant={GameVariantEnum.ATOMIC}>
            <p>
              In Circe + Atomic chess the return rules apply to every exploded piece.
            </p>

            <RulesExample
              id="5"
              description="After Nxe5 the black e pawn returns to e7, the exploded black knight returns to g8; also the exploded white knight returns from e5 to g1"
              variants={[GameVariantEnum.CIRCE, GameVariantEnum.ATOMIC]}
              fen="r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 6 4"
              moves="4. Nxe5"
              symbols={[
                ['f3->e5', 'e5:r', 'e5->f6:r'],
                ['e5->g1:b', 'f6->b8:b', 'e5->e7:b'],
              ]}
              gameRef={gameRef}
            />
          </Combination>

          <Combination variant={GameVariantEnum.CRAZYHOUSE}>
            <p>
              In Circe + Crazyhouse if the captured piece didn't disappear from the board, it doesn't go into the opponent's pocket.
            </p>
          </Combination>

          <CombinationLinkSection
            from={GameVariantEnum.CIRCE}
            to={GameVariantEnum.TWO_FAMILIES}
          />
        </Combinations>
      </React.Fragment>
    );
  }
}

export default CirceRules;
