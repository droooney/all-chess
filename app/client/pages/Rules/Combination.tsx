import React from 'react';

import { GameVariantEnum } from 'shared/types';

import GameVariantLink from 'client/components/GameVariantLink';

interface OwnProps {
  variant: GameVariantEnum;
  children: React.ReactNode;
}

type Props = OwnProps;

class Combination extends React.PureComponent<Props> {
  render() {
    const {
      variant,
      children,
    } = this.props;

    return (
      <section>
        <h3 id={`combinations-${variant}`}>
          <GameVariantLink variant={variant} />
        </h3>

        {children}
      </section>
    );
  }
}

export default Combination;
