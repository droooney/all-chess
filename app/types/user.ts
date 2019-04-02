export interface ShortUser {
  login: string;
}

export interface User extends ShortUser {
  id: number;
  email: string;
  password: string;
  confirmToken: string | null;
  confirmed: boolean;
  createdAt: Date;
  updatedAt: Date;
}
