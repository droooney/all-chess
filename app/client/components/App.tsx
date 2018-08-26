import * as React from 'react';
import { Route, Router, Switch } from 'react-router-dom';
import createHistory from 'history/createBrowserHistory';

import Home from './Home';
import Login from './Login';
import Register from './Register';

const history = createHistory();

export default class App extends React.Component {
  render() {
    return (
      <Router history={history}>

        <header>

        </header>

        <main>
          <Switch>
            <Route exact strict path="/" component={Home} />
            <Route exact strict path="/login" component={Login} />
            <Route exact strict path="/register" component={Register} />
          </Switch>
        </main>

        <footer>

        </footer>

      </Router>
    );
  }
}
