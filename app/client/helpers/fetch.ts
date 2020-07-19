import {
  RequestOptions,
  LoginRequestOptions,
  LogoutRequestOptions,
  RegisterRequestOptions,

  GenericResponse,
  LoginResponse,
  LogoutResponse,
  RegisterResponse
} from 'shared/types';

export async function fetch(options: LoginRequestOptions): Promise<LoginResponse>;
export async function fetch(options: LogoutRequestOptions): Promise<LogoutResponse>;
export async function fetch(options: RegisterRequestOptions): Promise<RegisterResponse>;

export async function fetch(options: RequestOptions): Promise<GenericResponse> {
  const additionalData: RequestInit = {};

  if (options.data) {
    additionalData.body = JSON.stringify(options.data);
    additionalData.headers = {
      'Content-Type': 'application/json'
    };
  }

  const response = await window.fetch(options.url, {
    credentials: 'same-origin',
    method: options.method.toUpperCase(),
    ...additionalData
  });

  if ((response.status >= 200 && response.status < 300) || response.status === 304) {
    return await response.json();
  }

  throw new Error(await response.text());
}
