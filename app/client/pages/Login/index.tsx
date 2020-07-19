import * as qs from 'querystring';
import * as React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router-dom';
import { FormControl, InputLabel } from '@material-ui/core';

import { fetch } from 'client/helpers';

import { setUserData } from 'client/actions';
import { DispatchProps } from 'client/store';

import Button from '../../components/Button';
import DocumentTitle from '../../components/DocumentTitle';
import Input from '../../components/Input';

import './index.less';

type Props = RouteComponentProps<any> & DispatchProps;

interface State {
  login: string;
  password: string;
  error: boolean;
}

class Login extends React.Component<Props, State> {
  state: State = {
    login: '',
    password: '',
    error: false,
  };

  onSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    const {
      dispatch,
      history,
    } = this.props;
    const {
      from = '/',
    } = qs.parse(location.search.slice(1));

    const {
      success,
      user,
    } = await fetch({
      url: '/api/auth/login',
      method: 'post',
      data: {
        login: this.state.login,
        password: this.state.password,
      },
    });

    if (success) {
      history.replace(typeof from === 'string' ? from : '/');

      dispatch(setUserData(user));
    } else {
      this.setState({
        error: true,
      });
    }
  };

  render() {
    return (
      <div className="route login-route">

        <DocumentTitle value="AllChess - Login" />

        <form className="login-form" onSubmit={this.onSubmit}>

          <FormControl error={this.state.error} required>
            <InputLabel htmlFor="login">
              Login
            </InputLabel>
            <Input
              id="login"
              type="text"
              value={this.state.login}
              onChange={(e) => this.setState({ login: e.currentTarget.value })}
            />
          </FormControl>

          <FormControl error={this.state.error} required>
            <InputLabel htmlFor="password">
              Password
            </InputLabel>
            <Input
              id="password"
              type="password"
              value={this.state.password}
              onChange={(e) => this.setState({ password: e.currentTarget.value })}
            />
          </FormControl>

          <Button type="submit">
            Login
          </Button>

        </form>

      </div>
    );
  }
}

export default connect()(Login);
