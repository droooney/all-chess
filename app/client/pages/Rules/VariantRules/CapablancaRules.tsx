import React from 'react';

import { GameVariantEnum } from 'shared/types';

import { Game } from 'client/helpers';

import GameVariantLink from 'client/components/GameVariantLink';

import RulesExample from '../RulesExample';
import Combinations from '../Combinations';
import Overview from '../Overview';
import Setup from '../Setup';
import RulesExampleLink from '../RulesExampleLink';
import Pieces from '../Pieces';

interface OwnProps {
  gameRef(game: Game): void;
}

type Props = OwnProps;

class CapablancaRules extends React.PureComponent<Props> {
  render() {
    return (
      <React.Fragment>
        <Overview>
          <p>
            Capablanca chess is a variant which introduces two new pieces: Empress and Cardinal.
          </p>
        </Overview>

        <Setup>
          <p>
            Capablanca chess is played on a 10x8 board and has two more pieces: Empress (h1 and h8) and Cardinal (c1 and c8).
          </p>

          <RulesExample
            id="1"
            description="Starting position in Capablanca chess"
            variants={[GameVariantEnum.CAPABLANCA]}
          />
        </Setup>

        <Pieces>
          <p>
            There are two additional pieces in Capablanca chess:

            <br />
            <br />

            - Empress is a combination of Rook and Knight (see <RulesExampleLink id="2" />)

            <br />

            - Cardinal is a combination of Bishop and Knight (see <RulesExampleLink id="3" />)
          </p>

          <RulesExample
            id="2"
            description="Empress moves"
            variants={[GameVariantEnum.CAPABLANCA]}
            fen="10/10/10/5E4/10/10/10/10 w - - 0 1"
            symbols={[
              [
                'a5', 'b5', 'c5', 'd5', 'e5', 'g5', 'h5', 'i5', 'j5',
                'f1', 'f2', 'f3', 'f4', 'f6', 'f7', 'f8',
                'e3', 'd4', 'd6', 'e7', 'g7', 'h6', 'h4', 'g3',
              ],
            ]}
          />

          <RulesExample
            id="3"
            description="Cardinal moves"
            variants={[GameVariantEnum.CAPABLANCA]}
            fen="10/10/10/5C4/10/10/10/10 w - - 0 1"
            symbols={[
              [
                'b1', 'c2', 'd3', 'e4', 'g6', 'h7', 'i8',
                'c8', 'd7', 'e6', 'g4', 'h3', 'i2', 'j1',
                'e3', 'd4', 'd6', 'e7', 'g7', 'h6', 'h4', 'g3',
              ],
            ]}
          />
        </Pieces>

        <Combinations>
          <p>
            Capablanca chess is a quite neutral variant and can be combined with any variant except
            {' '}<GameVariantLink variant={GameVariantEnum.TWO_FAMILIES} />.
          </p>
        </Combinations>
      </React.Fragment>
    );
  }
}

export default CapablancaRules;
