import { Game, PublicUser } from 'shared/types';

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
  user: PublicUser;
}

export interface LogoutResponse extends GenericResponse {}

export interface RegisterSuccessfulResponse extends SuccessfulResponse {
  user: PublicUser;
}

export interface RegisterFailedResponse extends FailedResponse {
  errors: {
    login: boolean;
    email: boolean;
  };
}

export type RegisterResponse = RegisterSuccessfulResponse | RegisterFailedResponse;

export interface GetGameResponse extends GenericResponse {
  game: Game | null;
}
