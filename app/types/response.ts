import { ShortUser } from './user';

export interface GenericResponse {
  success: boolean;
}

export interface LoginResponse extends GenericResponse {
  user: ShortUser;
}

export interface LogoutResponse extends GenericResponse {}

export interface RegisterResponse extends GenericResponse {
  user: ShortUser;
}
