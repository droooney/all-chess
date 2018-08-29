import * as React from 'react';
import { connect, DispatchProp } from 'react-redux';
import { Link, RouteComponentProps, withRouter } from 'react-router-dom';

import { ReduxState } from '../../store';
import { setUserData } from '../../actions';
import { fetch } from '../../helpers';

import './index.less';

type Props = ReturnType<typeof mapStateToProps> & DispatchProp & RouteComponentProps<any>;

class Header extends React.Component<Props> {
  logout = async () => {
    const {
      dispatch,
      history
    } = this.props;
    const { success } = await fetch({
      url: '/api/auth/logout',
      method: 'get'
    });

    if (success) {
      history.push('/');

      dispatch(setUserData(null));
    }
  };

  render() {
    const {
      user
    } = this.props;

    return (
      <header>
        <Link to="/" className="main-link">
          AllChess
        </Link>
        <div className="right-header-block">
          {user ? (
            <React.Fragment>
              Logged in as <b>{user.login}</b> (
              <Link to="#" onClick={this.logout}>
                logout
              </Link>
              )
            </React.Fragment>
          ) : (
            <Link to="/login">
              Login
            </Link>
          )}
        </div>
      </header>
    );
  }
}

const mapStateToProps = (state: ReduxState) => ({
  user: state.user
});

export default withRouter(connect(mapStateToProps)(Header));
