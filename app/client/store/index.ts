import {
  Action,

  applyMiddleware,
  compose,
  createStore,
} from 'redux';
import { createLogger } from 'redux-logger';
import thunk from 'redux-thunk';

import rootReducer from '../reducers';

import { ReduxState } from './state';

const middlewares = [
  thunk,
  createLogger({
    collapsed: true,
  }),
];

type ActionCreators = typeof import('../actions');

type SimpleActionMap = {
  [K in {
    [K in keyof ActionCreators]: ActionCreators[K] extends (...args: any[]) => Action ? K : never;
  }[keyof ActionCreators]]: ReturnType<ActionCreators[K]>;
};

export type ReduxSimpleAction = ReturnType<ActionCreators[
  {
    [K in keyof ActionCreators]: ActionCreators[K] extends (...args: any[]) => Action ? K : never;
  }[keyof ActionCreators]
]>;

export type ReduxSimpleActionType = ReduxSimpleAction['type'];

export type ReduxSimpleActionByType<T extends ReduxSimpleActionType> = {
  [A in keyof SimpleActionMap]: SimpleActionMap[A]['type'] extends T ? SimpleActionMap[A] : never;
}[keyof SimpleActionMap];

export interface ReduxDispatch<A extends ReduxAction = ReduxAction> {
  (action: A): A extends ReduxThunkAction<any> ? ReturnType<A> : A;
  (action: A): A extends ReduxThunkAction<any> ? ReturnType<A> : A;
}

export type ReduxThunkAction<R> = (
  dispatch: ReduxDispatch,
  getState: () => ReduxState
) => R;

export type ReduxAction = ReduxSimpleAction | ReduxThunkAction<any>;

export interface DispatchProps {
  dispatch: ReduxDispatch;
}

const store = createStore<ReduxState, ReduxSimpleAction, {}, {}>(rootReducer, compose(applyMiddleware(...middlewares)));

export default store;
export * from './state';
