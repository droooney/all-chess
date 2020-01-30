import * as React from 'react';
import { FormControl, InputLabel } from '@material-ui/core';

import { fetch } from '../../helpers';

import Button from '../Button';
import DocumentTitle from '../DocumentTitle';
import Input from '../Input';

import './index.less';

interface State {
  login: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  emailChanged: boolean;
  success: boolean;
  loginError: boolean;
  emailError: boolean;
}

class Register extends React.Component<{}, State> {
  emailInputRef = React.createRef<HTMLInputElement>();
  state: State = {
    login: '',
    email: '',
    password: '',
    passwordConfirmation: '',
    emailChanged: false,
    success: false,
    loginError: false,
    emailError: false
  };

  onSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    const response = await fetch({
      url: '/api/auth/register',
      method: 'post',
      data: {
        login: this.state.login,
        email: this.state.email,
        password: this.state.password
      }
    });

    if (response.success) {
      this.setState({
        success: true,
        loginError: false,
        emailError: false
      });
    } else {
      this.setState({
        loginError: response.errors.login,
        emailError: response.errors.email
      });
    }
  };

  render() {
    return (
      <div className="route register-route">

        <DocumentTitle value="AllChess - Register" />

        {this.state.success ? (
          <div>
            Confirmation email has been sent to {this.state.email}
          </div>
        ) : (
          <form
            className="register-form"
            autoComplete="off"
            onSubmit={this.onSubmit}
          >

            <FormControl required error={this.state.loginError}>
              <InputLabel>
                Login
              </InputLabel>
              <Input
                type="text"
                autoComplete="off"
                value={this.state.login}
                onChange={(e) => this.setState({ login: e.currentTarget.value })}
              />
            </FormControl>

            <FormControl
              required
              error={
                (!!this.emailInputRef.current && !this.emailInputRef.current.validity.valid && this.state.emailChanged)
                || this.state.emailError
              }
            >
              <InputLabel>
                Email
              </InputLabel>
              <Input
                type="email"
                autoComplete="off"
                value={this.state.email}
                inputProps={{ ref: this.emailInputRef }}
                onChange={(e) => this.setState({ email: e.currentTarget.value, emailChanged: true })}
              />
            </FormControl>

            <FormControl required>
              <InputLabel>
                Password
              </InputLabel>
              <Input
                type="password"
                placeholder="Password"
                autoComplete="new-password"
                value={this.state.password}
                onChange={(e) => this.setState({ password: e.currentTarget.value })}
              />
            </FormControl>

            <FormControl required error={this.state.password !== this.state.passwordConfirmation}>
              <InputLabel>
                Repeat password
              </InputLabel>
              <Input
                type="password"
                autoComplete="off"
                value={this.state.passwordConfirmation}
                onChange={(e) => this.setState({ passwordConfirmation: e.currentTarget.value })}
              />
            </FormControl>

            <Button
              type="submit"
              disabled={this.state.password !== this.state.passwordConfirmation}
            >
              Register
            </Button>

          </form>
        )}

      </div>
    );
  }
}

export default Register;
