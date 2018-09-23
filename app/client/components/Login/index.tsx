import * as qs from 'querystring';
import * as React from 'react';
import { connect, DispatchProps } from 'react-redux';
import { RouteComponentProps } from 'react-router-dom';

import { setUserData } from '../../actions';
import { fetch } from '../../helpers';

import './index.less';

type Props = RouteComponentProps<any> & DispatchProps;

interface State {
  error: boolean;
}

class Login extends React.Component<Props, State> {
  loginInputRef = React.createRef<HTMLInputElement>();
  passwordInputRef = React.createRef<HTMLInputElement>();
  state = {
    error: false
  };

  onSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    const {
      dispatch,
      history
    } = this.props;
    const {
      from = '/'
    } = qs.parse(location.search.slice(1));
    const login = this.loginInputRef.current!.value;
    const password = this.passwordInputRef.current!.value;

    const {
      success,
      user
    } = await fetch({
      url: '/api/auth/login',
      method: 'post',
      data: {
        login,
        password
      }
    });

    if (success) {
      history.replace(typeof from === 'string' ? from : '/');

      dispatch(setUserData(user));
    } else {
      this.setState({
        error: true
      });
    }
  };

  render() {
    return (
      <div className="route login-route">

        {this.state.error && (
          <div className="error">
            Wrong login or password
          </div>
        )}

        <form onSubmit={this.onSubmit}>
          <input
            type="text"
            placeholder="Login"
            ref={this.loginInputRef}
          />
          <input
            type="password"
            placeholder="Password"
            ref={this.passwordInputRef}
          />
          <input
            type="submit"
            value="Login"
          />
        </form>

      </div>
    );
  }
}

export default connect()(Login);
