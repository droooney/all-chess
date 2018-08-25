export interface Config {
  cookieName: string,
  port: number;
  redis: {
    host: string;
    port: number;
  };
  secret: string;
  sessionExpires: number,
}
