import React from 'react';

import { GameVariantEnum } from 'shared/types';

import { Game } from 'client/helpers';

import GameVariantLinks from 'client/components/GameVariantLinks';

import RulesExample from '../RulesExample';
import RulesExampleLink from '../RulesExampleLink';
import Overview from '../Overview';
import Moves from '../Moves';
import GameEnd from '../GameEnd';
import Combinations from '../Combinations';
import Combination from '../Combination';
import CombinationLinkSection from '../CombinationLinkSection';

interface OwnProps {
  gameRef(game: Game): void;
}

type Props = OwnProps;

class KOTHRules extends React.PureComponent<Props> {
  render() {
    const {
      gameRef,
    } = this.props;

    return (
      <React.Fragment>
        <Overview>
          <p>
            King of the Hill is a variant where moving the king to the center counts as a win.
          </p>
        </Overview>

        <Moves>
          <p>
            Everything is the same as in standard chess.

            <br />
            <br />

            Note: the king can't move to the center if it's an illegal move.
          </p>
        </Moves>

        <GameEnd>
          <p>
            Additional way to win the game is moving the king to the 4 center squares.
          </p>

          <RulesExample
            id="1"
            description="Win in King of the Hill"
            variants={[GameVariantEnum.KING_OF_THE_HILL]}
            fen="8/4k3/3rP2p/p1pB4/Pp3N2/4K3/1PP3PP/8 w - - 0 28"
            moves="28. Ke4#"
            gameRef={gameRef}
          />
        </GameEnd>

        <Combinations>
          <p>
            King of the Hill is a pretty neutral variant, so it can be combined with almost any variant. Exceptions are
            {' '}<GameVariantLinks variants={[GameVariantEnum.ANTICHESS, GameVariantEnum.CIRCULAR_CHESS]} />.
          </p>

          <Combination variant={GameVariantEnum.HEXAGONAL_CHESS}>
            <p>
              In King of the Hill + Hexagonal chess there are 7 center squares (see <RulesExampleLink id="2" />)
            </p>

            <RulesExample
              id="2"
              description="Center squares in Hexagonal chess"
              variants={[GameVariantEnum.KING_OF_THE_HILL, GameVariantEnum.HEXAGONAL_CHESS]}
            />
          </Combination>

          <CombinationLinkSection
            from={GameVariantEnum.KING_OF_THE_HILL}
            to={GameVariantEnum.TWO_FAMILIES}
          />
        </Combinations>
      </React.Fragment>
    );
  }
}

export default KOTHRules;
