import * as qs from 'querystring';
import * as React from 'react';
import { connect, DispatchProp } from 'react-redux';
import { RouteComponentProps } from 'react-router-dom';

import { setUserData } from '../../actions';
import { fetch } from '../../helpers';

import './index.less';

type Props = RouteComponentProps<any> & DispatchProp;

interface State {
  error: boolean;
}

class Login extends React.Component<Props, State> {
  loginInput: HTMLInputElement | null = null;
  passwordInput: HTMLInputElement | null = null;
  state = {
    error: false
  };

  onSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    console.log('submitting');

    const {
      dispatch,
      history
    } = this.props;
    const {
      from = '/'
    } = qs.parse(location.search.slice(1));
    const login = this.loginInput!.value;
    const password = this.passwordInput!.value;

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
            ref={(input) => this.loginInput = input}
          />
          <input
            type="password"
            placeholder="Password"
            ref={(input) => this.passwordInput = input}
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
