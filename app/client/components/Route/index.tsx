import omit from 'lodash/omit';
import * as React from 'react';
import {
  withRouter,
  Route as RouterRoute,
  RouteProps,
  RouteComponentProps,
} from 'react-router-dom';

type Props = RouteProps & RouteComponentProps<any, any, { resetScroll?: boolean; hashLink?: boolean; } | undefined>;

class Route extends React.Component<Props> {
  componentDidUpdate(prevProps: Props) {
    const {
      history,
      location: {
        state,
        ...location
      },
    } = this.props;

    if (state?.resetScroll && !prevProps.location.state?.resetScroll) {
      window.scrollTo(0, 0);
      history.replace({
        ...location,
        state: omit(state, 'resetScroll'),
      });
    } else if (state?.hashLink && !prevProps.location.state?.hashLink) {
      if (location.hash) {
        const element = document.getElementById(location.hash.slice(1));

        element?.scrollIntoView();

        history.replace({
          ...location,
          state: omit(state, 'hashLink'),
        });
      }
    }
  }

  render() {
    const props = omit(this.props, ['history', 'location', 'match', 'staticContext']);

    return (
      <RouterRoute {...props} />
    );
  }
}

export default withRouter(Route);
