import * as _ from 'lodash';
import * as React from 'react';
import { Redirect, RouteComponentProps, Switch } from 'react-router-dom';
import { MenuItem, Select } from '@material-ui/core';

import {
  GameVariantEnum
} from '../../../types';
import {
  GAME_VARIANT_NAMES,
  GAME_VARIANT_LINKS
} from '../../../shared/constants';

import Route from '../Route';

import DocumentTitle from '../DocumentTitle';
import GameRules from '../GameRules';
import GameVariantLink from '../GameVariantLink';

import './index.less';

type Props = RouteComponentProps<{ gameLink?: string; }>;

export default class GamesRules extends React.Component<Props> {
  render() {
    const {
      history,
      match: {
        params: {
          gameLink
        }
      }
    } = this.props;
    const gameType = _.findKey(GAME_VARIANT_LINKS, (link) => link === gameLink) as GameVariantEnum;

    return (
      <div className="route rules-route">
        <div className="desktop-variants">
          {_.map(GameVariantEnum, (variant) => (
            <GameVariantLink key={variant} variant={variant} />
          ))}
        </div>
        <div className="mobile-variants">
          <Select
            displayEmpty
            value={gameType || ''}
            renderValue={() => gameType ? GAME_VARIANT_NAMES[gameType] : 'Select variant'}
            onChange={(e) => history.push(`/rules/${GAME_VARIANT_LINKS[e.target.value as GameVariantEnum]}`)}
          >
            {_.map(GameVariantEnum, (variant) => (
              <MenuItem key={variant} value={variant}>
                {GAME_VARIANT_NAMES[variant]}
              </MenuItem>
            ))}
          </Select>
        </div>
        <div className="rules-container">
          <Switch>
            <Route exact strict path={`/rules/:gameLink(${_.map(GAME_VARIANT_LINKS).join('|')})`} component={GameRules}/>
            <Route
              exact
              strict
              path="/rules"
              component={() => (
                <React.Fragment>
                  <DocumentTitle value="AllChess - Rules" />
                  <h1>
                    Rules
                  </h1>
                  <p>
                    This section covers rules of all the chess variants on AllChess including combinations of them
                    (which combinations are allowed, which are not, and if there are some peculiarities
                    in the variants combinations, those are described as well).
                  </p>
                </React.Fragment>
              )}
            />
            <Redirect to="/rules" />
          </Switch>
        </div>
      </div>
    );
  }
}
