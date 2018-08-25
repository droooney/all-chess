declare module 'gulp-run' {
  import { Duplex } from 'stream';

  interface GulpRunOptions {
    env?: {
      [param: string]: string;
    };
    cwd?: string;
    silent?: boolean;
    verbosity?: 0 | 1 | 2 | 3;
  }

  interface Command {
    exec(): Duplex;
  }

  const GulpRunner: (command: string, options?: GulpRunOptions) => Command;

  export = GulpRunner;
}
