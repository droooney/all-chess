import * as React from 'react';
import { connect } from 'react-redux';
import { Redirect, Router, Switch } from 'react-router-dom';
import { ThemeProvider } from '@material-ui/styles';
import { createBrowserHistory } from 'history';

import { isMobileDevice } from 'client/helpers';

import { setIsMobile } from 'client/actions';
import { DispatchProps, ReduxState } from 'client/store';

import Route from 'client/components/Route';
import Header from 'client/components/App/Header';

import GamesRules from 'client/pages/GamesRules';
import Home from 'client/pages/Home';
import BoardEditor from 'client/pages/BoardEditor';
import Register from 'client/pages/Register';
import Games from 'client/pages/Games';
import Game from 'client/pages/Game';
import Login from 'client/pages/Login';

import lightTheme from 'client/themes/light';

import './index.less';

const history = createBrowserHistory();

type Props = ReturnType<typeof mapStateToProps> & DispatchProps;

class App extends React.Component<Props> {
  componentDidMount(): void {
    window.addEventListener('resize', this.onWindowResize);
  }

  onWindowResize = () => {
    const {
      dispatch,
      isMobile,
    } = this.props;
    const newIsMobile = isMobileDevice();

    if (isMobile !== newIsMobile) {
      dispatch(setIsMobile(newIsMobile));
    }
  };

  render() {
    return (
      <ThemeProvider theme={lightTheme}>
        <Router history={history}>
          <div className="route route-root">
            <Header/>

            <main>
              <Switch>
                <Route exact strict path="/" component={Home}/>
                <Route strict path="/editor" component={BoardEditor}/>
                <Route strict path="/rules/:gameLink?" component={GamesRules}/>
                <Route exact strict path="/login" component={Login}/>
                <Route exact strict path="/register" component={Register}/>
                <Route exact strict path="/games" component={Games}/>
                <Route exact strict path="/games/:gameId" component={Game}/>
                <Redirect to="/"/>
              </Switch>
            </main>
          </div>
        </Router>
      </ThemeProvider>
    );
  }
}

const mapStateToProps = (state: ReduxState) => ({
  isMobile: state.common.isMobile,
});

export default connect(mapStateToProps)(App);
