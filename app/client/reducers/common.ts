import { CommonState } from '../store';
import {
  CommonActions,

  SetIsMobileAction
} from '../actions';
import { isMobileDevice } from '../helpers';

const initialState: CommonState = {
  isMobile: isMobileDevice(),
  isTouchDevice: 'ontouchstart' in window
};

type Action = (
  SetIsMobileAction
  | { type: '' }
);

export default (
  state: CommonState = initialState,
  action: Action
): CommonState => {
  switch (action.type) {
    case CommonActions.SET_IS_MOBILE: {
      return {
        ...state,
        isMobile: action.isMobile
      };
    }

    default: {
      return state;
    }
  }
};
