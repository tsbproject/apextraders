import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Role } from '../generated/client';

const JWT_SECRET = process.env.JWT_SECRET || 'apex_traders_super_secret_jwt_key_2026';
const JWT_EXPIRES_IN = '7d';

/**
 * JWT Payload interface matching Prisma's updated Role enum
 */
export interface JwtPayload {
  id: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

/**
 * Payload required when generating a new token (excluding auto-generated claims)
 */
export type SignTokenPayload = Omit<JwtPayload, 'iat' | 'exp'>;

/**
 * Hashes a plain text password using bcryptjs with a salt factor of 12
 */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

/**
 * Compares a plain text password against a stored hash
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

/**
 * Generates a signed JWT access token with user details and role permissions
 */
export const generateToken = (payload: SignTokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verifies and decodes an incoming Bearer JWT token
 */
export const verifyToken = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, JWT_SECRET);

  if (typeof decoded === 'string' || !decoded || !('id' in decoded)) {
    throw new Error('Invalid JWT token payload structure');
  }

  return decoded as JwtPayload;
};