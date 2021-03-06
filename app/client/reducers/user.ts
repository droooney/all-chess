import { User } from 'shared/types';

import { getReducer } from 'client/helpers';

import { UserActions } from 'client/actions';
import { UserState } from 'client/store';

declare global {
  interface Window {
    __ALL_CHESS_USER__: User | null;
  }
}

const initialState: UserState = window.__ALL_CHESS_USER__;

export default getReducer(initialState, {
  [UserActions.SET_USER_DATA]: (_state, action) => action.user,
});
