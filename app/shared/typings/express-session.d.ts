import { User } from 'shared/types';

declare global {
  namespace Express {
    interface Session {
      user?: User;
    }
  }
}
