import { LocationDescriptorObject } from 'history';
import * as React from 'react';
import { Link as RouterLink, LinkProps } from 'react-router-dom';

interface OwnProps extends LinkProps {
  hashLink?: boolean;
  to: string | LocationDescriptorObject<any>;
}

type Props = OwnProps;

export default class Link extends React.Component<Props> {
  onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const {
      onClick,
    } = this.props;

    e.stopPropagation();

    if (onClick) {
      onClick(e);
    }
  };

  render() {
    const {
      to,
      hashLink,
      ...props
    } = this.props;

    return (
      <RouterLink
        {...props}
        to={{
          ...(
            typeof to === 'string'
              ? { pathname: to }
              : to
          ),
          state: {
            ...(hashLink ? { hashLink: true } : { resetScroll: true }),
            ...(typeof to === 'object' && to.state ? to.state : {}),
          },
        }}
        onClick={this.onClick}
      />
    );
  }
}
