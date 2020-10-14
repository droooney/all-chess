import * as React from 'react';
import { connect } from 'react-redux';
import { Redirect, Router, Switch } from 'react-router-dom';
import { ThemeProvider } from '@material-ui/styles';

import { getDefaultSettings, history, isMobileDevice } from 'client/helpers';

import { loadSettings, setIsMobile } from 'client/actions';
import { DispatchProps, ReduxState } from 'client/store';

import Route from 'client/components/Route';
import Header from 'client/components/App/Header';

import AllRules from 'client/pages/Rules/AllRules';
import BoardEditor from 'client/pages/BoardEditor';
import Register from 'client/pages/Register';
import Home from 'client/pages/Home';
import Game from 'client/pages/Game';
import Login from 'client/pages/Login';
import Settings from 'client/pages/Settings';

import lightTheme from 'client/themes/light';

import './index.less';

type Props = ReturnType<typeof mapStateToProps> & DispatchProps;

class App extends React.Component<Props> {
  componentDidMount(): void {
    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('storage', this.onStorageChange);
  }

  onStorageChange = () => {
    const {
      dispatch,
    } = this.props;

    dispatch(loadSettings(getDefaultSettings()));
  };

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
                <Route exact strict path="/" component={Home} />
                <Route strict path="/editor" component={BoardEditor} />
                <Route strict path="/rules/:gameLink?" component={AllRules} />
                <Route strict path="/settings/:settingsType?" component={Settings}/>
                <Route exact strict path="/login" component={Login} />
                <Route exact strict path="/register" component={Register} />
                <Route exact strict path="/game/:gameId" component={Game} />
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
