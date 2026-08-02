import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/auth';
import { Role } from '../generated/client';

/**
 * JWT payload used across ApexTraders.
 *
 * IMPORTANT:
 * JWT identity is always `id`.
 * Database foreign keys may still use `userId`.
 */
export interface ApexJwtPayload {
  id: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

/**
 * Express request extended with authenticated JWT user.
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
 * Authenticate Bearer JWT.
 *
 * Expected header:
 * Authorization: Bearer <token>
 */
export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      message: 'Access Denied: Missing Authentication Token',
    });
    return;
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    res.status(401).json({
      message: 'Access Denied: Missing Authentication Token',
    });
    return;
  }

  try {
    const decoded = verifyToken(token);

    // Defensive runtime validation.
    if (
      !decoded ||
      !decoded.id ||
      !decoded.email ||
      !decoded.role ||
      !Object.values(Role).includes(decoded.role)
    ) {
      res.status(403).json({
        message: 'Access Denied: Invalid Token Payload',
      });
      return;
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      iat: decoded.iat,
      exp: decoded.exp,
    };

    next();
  } catch (error) {
    console.error('JWT authentication error:', error);

    res.status(403).json({
      message: 'Access Denied: Invalid or Expired Token',
    });
    return;
  }
};

/**
 * Role-Based Access Control (RBAC).
 *
 * Example:
 * authorizeRoles(Role.ADMIN, Role.SUPER_ADMIN)
 */
export const authorizeRoles = (...allowedRoles: Role[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({
        message: 'Unauthorized: Authentication required.',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        message: 'Forbidden: Insufficient privileges.',
      });
      return;
    }

    next();
  };
};