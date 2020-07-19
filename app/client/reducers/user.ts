import { User } from '../../types';
import { UserState } from '../store';
import { UserActions } from '../actions';
import { getReducer } from 'client/helpers';

declare global {
  interface Window {
    __ALL_CHESS_USER__: User | null;
  }
}

const initialState: UserState = window.__ALL_CHESS_USER__;

export default getReducer(initialState, {
  [UserActions.SET_USER_DATA]: (_state, action) => action.user
});
