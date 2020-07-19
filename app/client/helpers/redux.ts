import { Reducer } from 'redux';

import { ReduxSimpleActionType, ReduxSimpleActionByType, ReduxSimpleAction } from 'client/store';

type ReducerObject<S, K extends ReduxSimpleActionType> = {
  [key in K]: (state: S, action: ReduxSimpleActionByType<key>) => S;
};

export function getReducer<S, K extends ReduxSimpleActionType>(
  initialState: S,
  reducerObject: ReducerObject<S, K>,
): Reducer<S, ReduxSimpleAction> {
  return (state = initialState, action) => {
    for (const actionType in reducerObject) {
      if (action.type === actionType) {
        return reducerObject[actionType](state, action as any);
      }
    }

    return state;
  };
}
