import * as qs from 'querystring';
import * as React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';

import { DispatchProps, ReduxState } from '../../store';
import { setUserData } from '../../actions';
import { fetch } from '../../helpers';
import { STANDARD_FEN } from '../../constants';

import Link from '../Link';

import './index.less';

type Props = ReturnType<typeof mapStateToProps> & DispatchProps & RouteComponentProps<any>;

class Header extends React.Component<Props> {
  logout = async (e: React.MouseEvent) => {
    e.preventDefault();

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
      location,
      user
    } = this.props;
    const from = location.pathname + location.search;

    return (
      <header>
        <div className="main-link">
          <Link to="/">
            AllChess
          </Link>
        </div>
        <div className="right-header-block">
          <Link
            to={{
              pathname: '/editor',
              search: `?${qs.stringify({
                fen: STANDARD_FEN,
                variants: ''
              })}`
            }}
            style={{ marginRight: 20 }}
          >
            Editor
          </Link>
          <Link to="/rules" style={{ marginRight: 20 }}>
            Rules
          </Link>
          {user ? (
            <React.Fragment>
              Logged in as <b>{user.login}</b> (
              <Link to="#" onClick={this.logout}>
                logout
              </Link>
              )
            </React.Fragment>
          ) : (
            <React.Fragment>
              <Link to="/register" style={{ marginRight: 20 }}>
                Register
              </Link>
              <Link
                replace
                to={{
                  pathname: '/login',
                  search: from === '/' ? '' : `?${qs.stringify({ from })}`
                }}
              >
                Login
              </Link>
            </React.Fragment>
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
