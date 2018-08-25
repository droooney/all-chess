import { UserState } from '../store';

declare global {
  interface Window {
    __ALL_CHESS_USER__: string;
  }
}

const initialState: UserState = JSON.parse(window.__ALL_CHESS_USER__);

type Action = (
  { type: '' }
);

export default (
  state: UserState = initialState,
  action: Action
): UserState => {
  switch (action.type) {
    default: {
      return state;
    }
  }
};
