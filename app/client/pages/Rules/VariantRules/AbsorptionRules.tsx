import React from 'react';

import { GameVariantEnum } from 'shared/types';

import { Game } from 'client/helpers';

import GameVariantLink from 'client/components/GameVariantLink';
import GameVariantLinks from 'client/components/GameVariantLinks';

import Combinations from '../Combinations';
import List from '../List';
import Moves from '../Moves';
import Overview from '../Overview';
import RulesExample from '../RulesExample';

interface OwnProps {
  gameRef(game: Game): void;
}

type Props = OwnProps;

class AbsorptionRules extends React.PureComponent<Props> {
  render() {
    const {
      gameRef,
    } = this.props;

    return (
      <React.Fragment>
        <Overview>
          <p>
            Absorption chess is a variant in which after a capture the piece absorbs the capturing captured piece abilities.
          </p>
        </Overview>

        <Moves>
          <p>
            After a move if the moved piece captured a piece it "absorbs" the captured piece abilities according to the following rules:
          </p>

          <List
            elements={[
              'pawns don\'t have any abilities',
              'if the capturing piece is a pawn it becomes the captured piece',
              'if the capturing piece is a king it becomes a royal piece of the captured piece type; it also continues to have king moves',
              'if the capturing piece is a royal piece, it absorbs the captured piece as a usual piece and stays royal',
            ]}
          />

          <RulesExample
            id="1"
            description="The diagram shows different captures outcomes"
            variants={[GameVariantEnum.ABSORPTION]}
            fen="7r/3k4/2n5/P4n2/r2b2K1/4P1BN/2B5/8 w - - 0 32"
            moves="32. Bxa4 Nxg3 33. Qxc6+ Kxc6 34. exd4 Rxh3 35. Kxh3 Kxa5 36. Kxg3"
            gameRef={gameRef}
          />

          <p>
            As in <GameVariantLink variant={GameVariantEnum.FRANKFURT} /> when moving a royal piece can't have any attacked squares on its path.
          </p>
        </Moves>

        <Combinations>
          <p>
            Absorption chess can't be combined with many variants. This includes <GameVariantLinks variants={[
              GameVariantEnum.ANTICHESS, GameVariantEnum.ATOMIC, GameVariantEnum.BENEDICT_CHESS,
              GameVariantEnum.CIRCE, GameVariantEnum.COMPENSATION_CHESS, GameVariantEnum.CRAZYHOUSE,
              GameVariantEnum.FRANKFURT, GameVariantEnum.MADRASI,
            ]} />.
          </p>
        </Combinations>
      </React.Fragment>
    );
  }
}

export default AbsorptionRules;
