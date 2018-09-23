import { combineReducers } from 'redux';

import { ReduxState } from '../store/state';

import gameSettingsReducer from './gameSettings';
import userReducer from './user';

export default combineReducers<ReduxState>({
  gameSettings: gameSettingsReducer,
  user: userReducer
});
