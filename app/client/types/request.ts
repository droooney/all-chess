export interface RequestOptions {
  url: string;
  method: 'get' | 'post';
  urlParams?: object;
  data?: unknown;
}

export interface LoginRequestOptions extends RequestOptions {
  url: '/api/auth/login';
  method: 'post';
  data: {
    login: string;
    password: string;
  };
}

export interface LogoutRequestOptions {
  url: '/api/auth/logout';
  method: 'get';
}

export interface RegisterRequestOptions extends RequestOptions {
  url: '/api/auth/register';
  method: 'post';
  data: {
    email: string;
    login: string;
    password: string;
  };
}

export interface GetGameRequestOptions extends RequestOptions {
  url: '/api/game/{gameId}';
  method: 'get';
  urlParams: { gameId: string; };
}
