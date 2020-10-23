import { getDefaultSettings, getReducer } from 'client/helpers';

import { GameSettingsActions } from 'client/actions';
import { GameSettingsState } from 'client/store';

const initialState: GameSettingsState = getDefaultSettings();

export default getReducer(initialState, {
  [GameSettingsActions.CHANGE_SETTINGS]: (state, action) => ({
    ...state,
    [action.key]: action.value,
  }),
  [GameSettingsActions.LOAD_SETTINGS]: (_state, action) => action.settings,
});
