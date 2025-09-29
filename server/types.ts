import type { Request } from 'express';
import type { User as SchemaUser } from '@shared/schema';

export interface AuthenticatedRequest extends Request {
  user?: SchemaUser;
}

declare global {
  namespace Express {
    interface User extends SchemaUser {}
    interface Request {
      user?: SchemaUser;
      logIn: (user: SchemaUser, callback: (err: any) => void) => void;
      logout: (callback: (err: any) => void) => void;
      isAuthenticated: () => boolean;
    }
  }
}