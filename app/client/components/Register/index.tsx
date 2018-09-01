import * as React from 'react';

import { fetch } from '../../helpers';

import './index.less';

interface State {
  success: boolean;
  error: boolean;
  email: string;
}

class Register extends React.Component<{}, State> {
  loginInput: HTMLInputElement | null = null;
  emailInput: HTMLInputElement | null = null;
  passwordInput: HTMLInputElement | null = null;
  passwordRepeatInput: HTMLInputElement | null = null;
  state = {
    success: false,
    error: false,
    email: ''
  };

  onSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    const login = this.loginInput!.value;
    const email = this.emailInput!.value;
    const password = this.passwordInput!.value;

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
              ref={(input) => this.loginInput = input}
            />
            <input
              type="email"
              placeholder="Email"
              autoComplete="off"
              ref={(input) => this.emailInput = input}
            />
            <input
              type="password"
              placeholder="Password"
              autoComplete="off"
              ref={(input) => this.passwordInput = input}
              onChange={() => this.forceUpdate()}
            />
            <input
              type="password"
              placeholder="Repeat password"
              autoComplete="off"
              ref={(input) => this.passwordRepeatInput = input}
              onChange={() => this.forceUpdate()}
            />
            <input
              type="submit"
              value="Register"
              disabled={!!this.passwordInput && !!this.passwordRepeatInput && this.passwordInput.value !== this.passwordRepeatInput.value}
            />
          </form>
        )}

      </div>
    );
  }
}

export default Register;
