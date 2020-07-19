import { getReducer, getScrollSize, isMobileDevice } from 'client/helpers';

import { CommonState } from 'client/store';
import { CommonActions } from 'client/actions';

const initialState: CommonState = {
  isMobile: isMobileDevice(),
  isTouchDevice: 'ontouchstart' in window,
  scrollSize: getScrollSize(),
};

export default getReducer(initialState, {
  [CommonActions.SET_IS_MOBILE]: (state, action) => ({
    ...state,
    isMobile: action.isMobile,
  }),
});
