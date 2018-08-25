import {
  applyMiddleware,
  compose,
  combineReducers,
  createStore
} from 'redux';
import { createLogger } from 'redux-logger';

import { ReduxState } from './state';

import userReducer from '../reducers/user';

const middlewares = [
  createLogger({
    collapsed: true
  })
];
const rootReducer = combineReducers<ReduxState>({
  user: userReducer
});

// console.log(initialState);
const store = createStore(rootReducer, compose(applyMiddleware(...middlewares)));

export default store;
export * from './state';
