export interface DBConnection {
  username: string;
  password?: string;
  database: string;
  host: string;
  dialect: 'postgres';
}

export interface DBConfig {
  development: DBConnection;
  test: DBConnection;
  production: DBConnection;
}
