import React from 'react';

import { GameVariantEnum } from 'shared/types';

import { Game } from 'client/helpers';

import GameVariantLinks from 'client/components/GameVariantLinks';

import RulesExample from '../RulesExample';
import Overview from '../Overview';
import Moves from '../Moves';
import WinningConditions from '../WinningConditions';
import Combinations from '../Combinations';

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
            Everything is the same as in standard chess. Note: the king can't move to the center if it's an illegal move.
          </p>
        </Moves>

        <WinningConditions>
          <p>
            Everything is the same as in standard chess. Note: the king can't move to the center if it's an illegal move.
          </p>

          <RulesExample
            id="1"
            description="Win in King of the Hill"
            variants={[GameVariantEnum.KING_OF_THE_HILL]}
            fen="8/4k3/3rP2p/p1pB4/Pp3N2/4K3/1PP3PP/8 w - - 0 28"
            moves="28. Ke4#"
            gameRef={gameRef}
          />
        </WinningConditions>

        <Combinations>
          King of the Hill is a pretty neutral variant. It can't be combined with
          {' '}<GameVariantLinks variants={[GameVariantEnum.ANTICHESS, GameVariantEnum.BENEDICT_CHESS, GameVariantEnum.CIRCULAR_CHESS]} />.
        </Combinations>
      </React.Fragment>
    );
  }
}

export default KOTHRules;
