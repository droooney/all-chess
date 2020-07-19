import { GameSettingsState } from 'client/store';
import { GameSettingsActions } from 'client/actions';
import { getDefaultSettings, getReducer } from 'client/helpers';

const initialState: GameSettingsState = getDefaultSettings();

export default getReducer(initialState, {
  [GameSettingsActions.CHANGE_SETTINGS]: (state, action) => ({
    ...state,
    [action.key]: action.value
  })
});
