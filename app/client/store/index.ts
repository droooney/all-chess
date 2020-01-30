import {
  Action,

  applyMiddleware,
  compose,
  createStore
} from 'redux';
import { createLogger } from 'redux-logger';
import thunk, { ThunkDispatch } from 'redux-thunk';

import { ReduxState } from './state';

import rootReducer from '../reducers';

const middlewares = [
  thunk,
  createLogger({
    collapsed: true
  })
];

export type CustomDispatch = ThunkDispatch<ReduxState, never, Action>;

export type CustomThunkAction<R> = (
  dispatch: CustomDispatch,
  getState: () => ReduxState
) => R;

export interface DispatchProps {
  dispatch: CustomDispatch;
}

const store = createStore(rootReducer, compose(applyMiddleware(...middlewares)));

export default store;
export * from './state';
