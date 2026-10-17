import bcrypt from 'bcryptjs';

// ==========================================
// PASSWORD HASHING
// ==========================================

/**
 * Hash plain-text password before database storage.
 */
export const hashPassword = async (
  password: string
): Promise<string> => {
  const salt = await bcrypt.genSalt(12);

  return bcrypt.hash(
    password,
    salt
  );
};

/**
 * Compare login password against stored bcrypt hash.
 */
export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(
    password,
    hash
  );
};

