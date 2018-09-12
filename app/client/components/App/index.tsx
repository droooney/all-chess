import * as React from 'react';
import {
  Redirect,
  Route,
  Router,
  Switch
} from 'react-router-dom';
import createHistory from 'history/createBrowserHistory';

import Header from '../Header';

import Home from '../Home';
import Login from '../Login';
import Register from '../Register';
import Games from '../Games';
import Game from '../Game';

import './index.less';

const history = createHistory();

export default class App extends React.Component {
  render() {
    return (
      <Router history={history}>
        <div className="route route-root">

          <Header />

          <main>
            <Switch>
              <Route exact strict path="/" component={Home} />
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
