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

type LocalCustomDispatch = ThunkDispatch<ReduxState, never, Action>;

declare module 'redux' {
  export type CustomDispatch = LocalCustomDispatch;
}

declare module 'redux-thunk' {
  // eslint-disable-next-line
  export type CustomThunkAction<R> = (
    dispatch: LocalCustomDispatch,
    getState: () => ReduxState
  ) => R;
}

declare module 'react-redux' {
  export interface DispatchProps {
    dispatch: LocalCustomDispatch;
  }
}

// console.log(initialState);
const store = createStore(rootReducer, compose(applyMiddleware(...middlewares)));

export default store;
export * from './state';
