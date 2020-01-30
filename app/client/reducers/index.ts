import { combineReducers } from 'redux';

import { ReduxState } from '../store/state';

import commonReducer from './common';
import gameSettingsReducer from './gameSettings';
import userReducer from './user';

export default combineReducers<ReduxState>({
  common: commonReducer,
  gameSettings: gameSettingsReducer,
  user: userReducer
});
