import { PublicUser } from 'shared/types';

declare global {
  namespace Express {
    interface Session {
      user?: PublicUser | null;
    }
  }
}
