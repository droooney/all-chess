import * as _ from 'lodash';
import * as React from 'react';
import {
  withRouter,
  Route as RouterRoute,
  RouteProps,
  RouteComponentProps,
} from 'react-router-dom';

type Props = RouteProps & RouteComponentProps<any, any, { resetScroll?: boolean; } | undefined>;

class Route extends React.Component<Props> {
  componentDidUpdate() {
    const {
      history,
      location: {
        state,
        ...location
      },
    } = this.props;

    if (state && state.resetScroll) {
      window.scrollTo(0, 0);
      history.replace({
        ...location,
        state: _.omit(state, 'resetScroll'),
      });
    }
  }

  render() {
    const props = _.omit(this.props, ['history', 'location', 'match', 'staticContext']);

    return (
      <RouterRoute {...props} />
    );
  }
}

export default withRouter(Route);
