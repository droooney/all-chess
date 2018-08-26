export interface User {
  id: number;
  email: string;
  login: string;
  password: string;
  confirmToken: string | null;
  confirmed: boolean;
  createdAt: Date;
  updatedAt: Date;
}
