import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/auth';

/**
 * 🔐 Custom JWT Payload Interface representing the decoded authentication token.
 */
export interface ApexJwtPayload {
  userId: string;
  email?: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  iat?: number;
  exp?: number;
}

/**
 * 🛡️ Extended Express Request interface supporting custom payload and route generics.
 */
export interface AuthenticatedRequest<
  P = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = Record<string, string>
> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user?: ApexJwtPayload;
}

/**
 * 🔒 Authenticate Token Middleware
 * Ensures the request includes a valid Bearer token in the Authorization header.
 */
export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Expecting: "Bearer <token>"

  if (!token) {
    res.status(401).json({ message: 'Access Denied: Missing Authentication Token' });
    return;
  }

  try {
    const decoded = verifyToken(token) as unknown as ApexJwtPayload;
    
    if (!decoded || !decoded.userId) {
      res.status(403).json({ message: 'Access Denied: Invalid Token Payload' });
      return;
    }

    req.user = decoded;
    next();
  } catch {
    res.status(403).json({ message: 'Access Denied: Invalid or Expired Token' });
    return;
  }
};

/**
 * 👑 Role-Based Access Control (RBAC) Middleware
 * Restricts access based on the user's role attached to req.user.
 */
export const authorizeRoles = (...allowedRoles: Array<'USER' | 'ADMIN' | 'SUPER_ADMIN'>) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({ message: 'Forbidden: Insufficient privileges.' });
      return;
    }
    next();
  };
};