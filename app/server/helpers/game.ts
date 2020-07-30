import pick from 'lodash/pick';

import { Game, GameMinimalData } from 'shared/types';

export function pickGameMinimalData(game: Game): GameMinimalData {
  return pick(game, [
    'id',
    'status',
    'players',
    'result',
    'timeControl',
    'variants',
  ]);
}
