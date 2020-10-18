import React from 'react';

import { GAME_VARIANT_NAMES } from 'shared/constants';

import { GameVariantEnum } from 'shared/types';

interface OwnProps {
  variant: GameVariantEnum;
}

type Props = OwnProps;

class CombinationHeader extends React.PureComponent<Props> {
  render() {
    const {
      variant,
    } = this.props;

    return (
      <h3 id={`combinations-${variant}`}>
        {GAME_VARIANT_NAMES[variant]}
      </h3>
    );
  }
}

export default CombinationHeader;
