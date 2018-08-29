import { User } from './User';

export interface GenericResponse {
  success: boolean;
}

export interface LoginResponse extends GenericResponse {
  user: User;
}

export interface LogoutResponse extends GenericResponse {}

export interface RegisterResponse extends GenericResponse {
  user: User;
}
