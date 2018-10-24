import * as React from 'react';

import { fetch } from '../../helpers';

import DocumentTitle from '../DocumentTitle';

import './index.less';

interface State {
  success: boolean;
  error: boolean;
  email: string;
}

class Register extends React.Component<{}, State> {
  loginInputRef = React.createRef<HTMLInputElement>();
  emailInputRef = React.createRef<HTMLInputElement>();
  passwordInputRef = React.createRef<HTMLInputElement>();
  passwordRepeatInputRef = React.createRef<HTMLInputElement>();
  state = {
    success: false,
    error: false,
    email: ''
  };

  onSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    const login = this.loginInputRef.current!.value;
    const email = this.emailInputRef.current!.value;
    const password = this.passwordInputRef.current!.value;

    const {
      success
    } = await fetch({
      url: '/api/auth/register',
      method: 'post',
      data: {
        login,
        email,
        password
      }
    });

    if (success) {
      this.setState({
        success: true,
        error: false,
        email
      });
    } else {
      this.setState({
        error: true
      });
    }
  };

  render() {
    return (
      <div className="route register-route">

        <DocumentTitle value="AllChess - Register" />

        {this.state.error && (
          <div className="error">
            Login or email already exists
          </div>
        )}

        {this.state.success ? (
          <div>
            Confirmation email has been sent to {this.state.email}
          </div>
        ) : (
          <form onSubmit={this.onSubmit} autoComplete="off">
            <input
              type="text"
              placeholder="Login"
              autoComplete="off"
              ref={this.loginInputRef}
            />
            <input
              type="email"
              placeholder="Email"
              autoComplete="off"
              ref={this.emailInputRef}
            />
            <input
              type="password"
              placeholder="Password"
              autoComplete="off"
              ref={this.passwordInputRef}
              onChange={() => this.forceUpdate()}
            />
            <input
              type="password"
              placeholder="Repeat password"
              autoComplete="off"
              ref={this.passwordRepeatInputRef}
              onChange={() => this.forceUpdate()}
            />
            <input
              type="submit"
              value="Register"
              disabled={(
                !!this.passwordInputRef.current
                && !!this.passwordRepeatInputRef.current
                && this.passwordInputRef.current.value !== this.passwordRepeatInputRef.current.value
              )}
            />
          </form>
        )}

      </div>
    );
  }
}

export default Register;
