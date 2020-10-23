import React from 'react';

import { GameVariantEnum } from 'shared/types';

import { Game } from 'client/helpers';

import GameVariantLinks from 'client/components/GameVariantLinks';

import Combinations from '../Combinations';
import Moves from '../Moves';
import Overview from '../Overview';
import RulesExample from '../RulesExample';

interface OwnProps {
  gameRef(game: Game): void;
}

type Props = OwnProps;

class CylinderRules extends React.PureComponent<Props> {
  render() {
    const {
      gameRef,
    } = this.props;

    return (
      <React.Fragment>
        <Overview>
          <p>
            Cylinder chess is a variant with a special board that has "a" and "h" files joined together.
          </p>
        </Overview>

        <Moves>
          <p>
            Everything is the same as in standard chess except pieces can move as if "a" and "h" files were adjacent.
            Also there is no castling.

            <br />
            <br />

            Note: pieces can't make full circle around the board stopping at the same square.
          </p>

          <RulesExample
            id="1"
            description="The bishop moves along the &quot;f1-g2-h3-a4&quot; diagonal and makes a check along the &quot;a4-h5-g6-f7-e8&quot; diagonal"
            variants={[GameVariantEnum.CYLINDER_CHESS]}
            fen="rnbqkbnr/ppppp1pp/8/5p2/8/6P1/PPPPPP1P/RNBQKBNR w - f6 0 2"
            moves="2. Ba4+"
            startBoardsFile="d"
            gameRef={gameRef}
          />
        </Moves>

        <Combinations>
          <p>
            Cylinder chess is a neutral variant. The only variants it can't be combined with are
            {' '}<GameVariantLinks variants={[GameVariantEnum.CIRCULAR_CHESS, GameVariantEnum.HEXAGONAL_CHESS]} />.
          </p>
        </Combinations>
      </React.Fragment>
    );
  }
}

export default CylinderRules;
