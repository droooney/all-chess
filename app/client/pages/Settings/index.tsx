import * as React from 'react';
import { Link, Redirect, RouteComponentProps, Switch } from 'react-router-dom';
import List from '@material-ui/core/List';
import MenuItem from '@material-ui/core/MenuItem';

import Route from '../../components/Route';

import DisplaySettings from './DisplaySettings';

import './index.less';

type Props = RouteComponentProps<{ settingsType?: string; }>;

class Settings extends React.PureComponent<Props> {
  render() {
    return (
      <div className="route settings-route">
        <nav className="settings-nav">
          <List>
            <MenuItem component={Link} to="/settings/display">
              Display
            </MenuItem>
          </List>
        </nav>

        <div className="settings-container">
          <Switch>
            <Route
              exact
              strict
              path="/settings/display"
              component={DisplaySettings}
            />

            <Route
              exact
              strict
              path="/settings"
              component={() => (
                <ul>
                  <li><Link to="/settings/display">Display settings</Link></li>
                </ul>
              )}
            />

            <Redirect to="/settings" />
          </Switch>
        </div>
      </div>
    );
  }
}

export default Settings;
