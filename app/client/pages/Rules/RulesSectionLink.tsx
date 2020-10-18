import React from 'react';

import { GAME_VARIANT_LINKS } from 'shared/constants';

import { GameVariantEnum } from 'shared/types';

import Link from 'client/components/Link';

interface OwnProps {
  variant: GameVariantEnum;
  section: string;
  children?: React.ReactNode;
}

type Props = OwnProps;

class RulesSectionLink extends React.PureComponent<Props> {
  render() {
    const {
      variant,
      section,
      children,
    } = this.props;

    return (
      <Link
        to={{
          pathname: `/rules/${GAME_VARIANT_LINKS[variant]}`,
          hash: section,
        }}
        hashLink
      >
        {children}
      </Link>
    );
  }
}

export default RulesSectionLink;
