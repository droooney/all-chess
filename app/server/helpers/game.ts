import { Game } from '../../types';

export function generateGameId(gameMap: { [gameId: string]: Game }): string {
  let gameId: string;

  do {
    gameId = Math.random().toString(36).slice(2);
  } while (gameMap[gameId]);

  return gameId;
}
