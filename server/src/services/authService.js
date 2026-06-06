'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

/**
 * Register a new user.
 *
 * @param {string} name
 * @param {string} email
 * @param {string} password  - plaintext; will be hashed with bcrypt rounds=12
 * @param {string} role      - 'admin' | 'officer'
 * @returns {{ user: { _id, name, email, role } }}
 */
async function register(name, email, password, role) {
  // Check for duplicate email
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, 'Email already in use');
  }

  // Hash the password
  const passwordHash = await bcrypt.hash(password, 12);

  // Persist the new user
  const user = await User.create({
    name,
    email,
    password: passwordHash,
    role,
  });

  return {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

/**
 * Authenticate a user and issue JWT tokens.
 *
 * @param {string} email
 * @param {string} password - plaintext password to verify
 * @returns {{ accessToken: string, refreshToken: string, user: { _id, name, email, role } }}
 */
async function login(email, password) {
  // Find user by normalised email
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // Verify password
  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // Issue access token (short-lived)
  const accessToken = jwt.sign(
    { userId: user._id, role: user.role, studentRef: user.studentRef || null },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );

  // Issue refresh token (long-lived)
  const refreshToken = jwt.sign(
    { userId: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  // Persist bcrypt hash of the refresh token (never store the raw token)
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  user.refreshTokenHash = refreshTokenHash;
  await user.save();

  return {
    accessToken,
    refreshToken,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

/**
 * Issue a new access token using the refresh token from the cookie.
 *
 * @param {string|undefined} cookieToken - raw refresh token from the httpOnly cookie
 * @returns {{ accessToken: string }}
 */
async function refreshAccessToken(cookieToken) {
  if (!cookieToken) {
    throw new ApiError(401, 'No refresh token');
  }

  // Verify signature and expiry; throws JsonWebTokenError / TokenExpiredError on failure
  const decoded = jwt.verify(cookieToken, process.env.JWT_REFRESH_SECRET);

  // Locate the user
  const user = await User.findById(decoded.userId);
  if (!user) {
    throw new ApiError(401, 'User not found');
  }

  // Guard against revoked sessions
  if (!user.refreshTokenHash) {
    throw new ApiError(401, 'Session revoked');
  }

  // Validate the raw token against the stored hash
  const tokenMatch = await bcrypt.compare(cookieToken, user.refreshTokenHash);
  if (!tokenMatch) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  // Issue a new access token
  const accessToken = jwt.sign(
    { userId: user._id, role: user.role, studentRef: user.studentRef || null },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );

  return { accessToken };
}

/**
 * Revoke a user's refresh token (logout).
 *
 * @param {string} userId
 */
async function logout(userId) {
  const user = await User.findById(userId);
  if (user) {
    user.refreshTokenHash = null;
    await user.save();
  }
}

module.exports = { register, login, refreshAccessToken, logout };
