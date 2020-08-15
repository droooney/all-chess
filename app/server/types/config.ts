export interface Config {
  cookieName: string,
  email: {
    auth: {
      user: string;
      pass: string;
    };
    from: {
      name: string;
      email: string;
    };
  },
  port: number;
  redis: {
    host: string;
    port: number;
  };
  secret: string;
}
