import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import config from '../config/index.js';
import { ConflictError, UnauthorizedError } from '../utils/errors.js';

const SALT_ROUNDS = 12;

const formatUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const signup = async ({ name, email, password }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ConflictError('An account with this email already exists', 'EMAIL_TAKEN');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
  });

  const token = signToken(user);
  return { user: formatUser(user), token };
};

const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } });

  // Deliberate constant-time check: always run bcrypt even if user is missing
  // to prevent timing-based email enumeration.
  const passwordMatch = user
    ? await bcrypt.compare(password, user.passwordHash)
    : await bcrypt.compare(password, '$2a$12$placeholderHashToPreventTimingAttacks');

  if (!user || !passwordMatch) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const token = signToken(user);
  return { user: formatUser(user), token };
};

const signToken = (user) => {
  return jwt.sign(
    { sub: user.id, email: user.email },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

export { signup, login };
