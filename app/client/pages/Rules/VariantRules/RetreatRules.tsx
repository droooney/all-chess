import React from 'react';

import { GameVariantEnum } from 'shared/types';

import { Game } from 'client/helpers';

import RulesExample from '../RulesExample';
import Combinations from '../Combinations';
import Overview from '../Overview';
import Moves from '../Moves';
import SpecialRules from '../SpecialRules';

interface OwnProps {
  gameRef(game: Game): void;
}

type Props = OwnProps;

class RetreatRules extends React.PureComponent<Props> {
  render() {
    const {
      gameRef,
    } = this.props;

    return (
      <React.Fragment>
        <Overview>
          <p>
            Retreat chess is a variant in which pawns can move backwards one square.
          </p>
        </Overview>

        <Moves>
          <p>
            Everything is the same as in standard chess except pawns can move backwards one square as well.
            A pawn can't move backwards if it's on the initial pawn rank.
          </p>

          <RulesExample
            id="1"
            description="Qh4+ is not checkmate in Retreat chess as white can retreat the g pawn to g3"
            variants={[GameVariantEnum.RETREAT_CHESS]}
            fen="rnb1kbnr/pppp1ppp/8/4p3/5PPq/8/PPPPP2P/RNBQKBNR w KQkq - 4 3"
            moves="3. g3"
            symbols={[
              ['g4->g3'],
            ]}
            gameRef={gameRef}
          />
        </Moves>

        <SpecialRules>
          <p>
            Pawn moves (if it's not promotion) do not reset 50-move rule, as they are revertable.
          </p>
        </SpecialRules>

        <Combinations>
          <p>
            Retreat chess can be combined with any variant.
          </p>
        </Combinations>
      </React.Fragment>
    );
  }
}

export default RetreatRules;
