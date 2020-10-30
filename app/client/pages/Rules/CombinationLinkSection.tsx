import React from 'react';

import { GAME_VARIANT_LINKS, GAME_VARIANT_NAMES } from 'shared/constants';

import { GameVariantEnum } from 'shared/types';

import Combination from './Combination';
import RulesSectionLink from './RulesSectionLink';

interface OwnProps {
  from: GameVariantEnum;
  to: GameVariantEnum;
}

type Props = OwnProps;

class CombinationLinkSection extends React.PureComponent<Props> {
  render() {
    const {
      from,
      to,
    } = this.props;

    return (
      <Combination variant={to}>
        <p>
          See{' '}

          <RulesSectionLink variant={to} section={`combination-${GAME_VARIANT_LINKS[from]}`}>
            {GAME_VARIANT_NAMES[to]} + {GAME_VARIANT_NAMES[from]}
          </RulesSectionLink>.
        </p>
      </Combination>
    );
  }
}

export default CombinationLinkSection;
