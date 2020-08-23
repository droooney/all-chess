import { Ratings } from 'shared/types/game';

export interface PublicUser {
  id: number;
  login: string;
  createdAt: Date;
}

export interface User extends PublicUser {
  email: string;
  password: string;
  confirmToken: string | null;
  confirmed: boolean;
  ratings: Ratings;
  updatedAt: Date;
}
