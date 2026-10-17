import jwt, { SignOptions } from 'jsonwebtoken';
import { Role } from '../generated/client';

// ==========================================
// JWT CONFIGURATION
// ==========================================

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    'JWT_SECRET is not configured. Add JWT_SECRET to the server environment.'
  );
}

const JWT_EXPIRES_IN: SignOptions['expiresIn'] = '7d';

// ==========================================
// JWT TYPES
// ==========================================

/**
 * Canonical ApexTraders JWT payload.
 *
 * IMPORTANT:
 * Authentication identity is `id`.
 *
 * Database relations may still use:
 * - Trade.userId
 * - Wallet.userId
 * - Participant.userId
 */
export interface JwtPayload {
  id: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export type SignTokenPayload = Omit<
  JwtPayload,
  'iat' | 'exp'
>;

export { hashPassword, comparePassword } from './password';

// ==========================================
// JWT GENERATION
// ==========================================

/**
 * Generate authenticated session token.
 *
 * Payload:
 * {
 *   id,
 *   email,
 *   role
 * }
 */
export const generateToken = (
  payload: SignTokenPayload
): string => {
  return jwt.sign(
    {
      id: payload.id,
      email: payload.email,
      role: payload.role,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    }
  );
};

// ==========================================
// JWT VERIFICATION
// ==========================================

/**
 * Verify and validate an incoming JWT.
 */
export const verifyToken = (
  token: string
): JwtPayload => {
  const decoded = jwt.verify(
    token,
    JWT_SECRET
  );

  if (
    typeof decoded === 'string' ||
    !decoded
  ) {
    throw new Error(
      'Invalid JWT token payload.'
    );
  }

  const id =
    typeof decoded.id === 'string'
      ? decoded.id
      : '';

  const email =
    typeof decoded.email === 'string'
      ? decoded.email
      : '';

  const role = decoded.role;

  if (
    !id ||
    !email ||
    typeof role !== 'string' ||
    !Object.values(Role).includes(
      role as Role
    )
  ) {
    throw new Error(
      'Invalid JWT token payload structure.'
    );
  }

  return {
    id,
    email,
    role: role as Role,
    iat: decoded.iat,
    exp: decoded.exp,
  };
};