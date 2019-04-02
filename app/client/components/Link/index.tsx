import * as React from 'react';
import { Link as RouterLink, LinkProps } from 'react-router-dom';
import { LocationDescriptorObject } from 'history';

interface OwnProps extends LinkProps {
  to: string | LocationDescriptorObject<never>;
}

type Props = OwnProps;

export default class Link extends React.Component<Props> {
  render() {
    const {
      to,
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
          state: { resetScroll: true }
        }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }
}
