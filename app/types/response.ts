import { ShortUser } from './user';

export interface GenericResponse {
  success: boolean;
}

export interface SuccessfulResponse {
  success: true;
}

export interface FailedResponse {
  success: false;
}

export interface LoginResponse extends GenericResponse {
  user: ShortUser;
}

export interface LogoutResponse extends GenericResponse {}

export interface RegisterSuccessfulResponse extends SuccessfulResponse {
  user: ShortUser;
}

export interface RegisterFailedResponse extends FailedResponse {
  errors: {
    login: boolean;
    email: boolean;
  };
}

export type RegisterResponse = RegisterSuccessfulResponse | RegisterFailedResponse;
