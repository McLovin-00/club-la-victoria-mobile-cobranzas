import { AuthUser } from '../../services/auth.service';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      sessionID?: string;
      auditData?: {
        action_type?: any;
        resource_type?: string;
        resource_id?: string;
        old_values?: object;
        new_values?: object;
        metadata?: object;
      };
      startTime?: number;
    }
  }
}
