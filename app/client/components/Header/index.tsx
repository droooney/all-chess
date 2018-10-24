import * as React from 'react';
import { connect, DispatchProps } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';

import { ReduxState } from '../../store';
import { setUserData } from '../../actions';
import { fetch } from '../../helpers';

import Link from '../Link';

import './index.less';

type Props = ReturnType<typeof mapStateToProps> & DispatchProps & RouteComponentProps<any>;

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
              <Link to="/Register" style={{ marginRight: 20 }}>
                Register
              </Link>
              <Link to="/login">
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
