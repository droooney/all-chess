import forEach from 'lodash/forEach';

import {
  RequestOptions,
  LoginRequestOptions,
  LogoutRequestOptions,
  RegisterRequestOptions,
  GetGameRequestOptions,

  GenericResponse,
  LoginResponse,
  LogoutResponse,
  RegisterResponse,
  GetGameResponse,
} from 'client/types';

export async function fetch(options: LoginRequestOptions): Promise<LoginResponse>;
export async function fetch(options: LogoutRequestOptions): Promise<LogoutResponse>;
export async function fetch(options: RegisterRequestOptions): Promise<RegisterResponse>;
export async function fetch(options: GetGameRequestOptions): Promise<GetGameResponse>;

export async function fetch(options: RequestOptions): Promise<GenericResponse> {
  const additionalData: RequestInit = {};
  let url = options.url;

  if (options.urlParams) {
    forEach(options.urlParams, (value, key) => {
      url = url.replace(new RegExp(`\\{${key}\\}`), value);
    });
  }

  if (options.data) {
    additionalData.body = JSON.stringify(options.data);
    additionalData.headers = {
      'Content-Type': 'application/json',
    };
  }

  const response = await window.fetch(url, {
    credentials: 'same-origin',
    method: options.method.toUpperCase(),
    ...additionalData,
  });

  if ((response.status >= 200 && response.status < 300) || response.status === 304) {
    return await response.json();
  }

  throw new Error(await response.text());
}
