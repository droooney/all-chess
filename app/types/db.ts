export interface DBConnection {
  username: string;
  password?: string;
  database: string;
  host: string;
  dialect: string;
}

export interface DBConfig {
  development: DBConnection;
  test: DBConnection;
  production: DBConnection;
}
