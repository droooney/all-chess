import * as React from 'react';
import {
  Redirect,
  Router,
  Switch
} from 'react-router-dom';
import { createBrowserHistory } from 'history';

import Route from '../Route';

import Header from '../Header';

import Home from '../Home';
import BoardEditor from '../BoardEditor';
import GamesRules from '../GamesRules';
import Login from '../Login';
import Register from '../Register';
import Games from '../Games';
import Game from '../Game';

import './index.less';

const history = createBrowserHistory();

export default class App extends React.Component {
  render() {
    return (
      <Router history={history}>
        <div className="route route-root">

          <Header />

          <main>
            <Switch>
              <Route exact strict path="/" component={Home} />
              <Route strict path="/editor" component={BoardEditor} />
              <Route strict path="/rules" component={GamesRules} />
              <Route exact strict path="/login" component={Login} />
              <Route exact strict path="/register" component={Register} />
              <Route exact strict path="/games" component={Games} />
              <Route exact strict path="/games/:gameId" component={Game} />
              <Redirect to="/" />
            </Switch>
          </main>
        </div>

      </Router>
    );
  }
}
