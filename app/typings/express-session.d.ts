import { User } from '../types';

declare global {
  namespace Express {
    interface Session {
      user?: User;
    }
  }
}
