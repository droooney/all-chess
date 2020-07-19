import { GameSettingsState } from '../store';
import { GameSettingsActions } from '../actions';
import { getDefaultSettings, getReducer } from '../helpers';

const initialState: GameSettingsState = getDefaultSettings();

export default getReducer(initialState, {
  [GameSettingsActions.CHANGE_SETTINGS]: (state, action) => ({
    ...state,
    [action.key]: action.value
  })
});
