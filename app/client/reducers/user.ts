import { User } from '../../types';
import { UserState } from '../store';
import {
  UserActions,

  SetUserDataAction
} from '../actions';

declare global {
  interface Window {
    __ALL_CHESS_USER__: User | null;
  }
}

const initialState: UserState = window.__ALL_CHESS_USER__;

type Action = (
  SetUserDataAction
  | { type: '' }
);

export default (
  state: UserState = initialState,
  action: Action
): UserState => {
  switch (action.type) {
    case UserActions.SET_USER_DATA: {
      return action.user;
    }

    default: {
      return state;
    }
  }
};
