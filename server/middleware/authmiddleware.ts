import { Request, Response, NextFunction } from 'express';
import { verifyToken, type JwtPayload } from '../lib/auth';

// 1. Extend Express Request type with optional generics to match Express.Request behavior
export interface AuthenticatedRequest<
  P = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = Record<string, string>
> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user?: JwtPayload;
}

/**
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
    const decoded = verifyToken(token); // Decodes JWT payload
    req.user = decoded;
    next();
  } catch {
    res.status(403).json({ message: 'Access Denied: Invalid or Expired Token' });
    return;
  }
};

/**
 * Role-Based Access Control (RBAC) middleware
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