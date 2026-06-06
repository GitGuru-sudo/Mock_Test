'use strict';

const authService = require('../services/authService');

// Cookie options for the refresh token
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  secure: process.env.NODE_ENV === 'production',
};

/**
 * POST /api/auth/register
 * Creates a new user account.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.body;
    const data = await authService.register(name, email, password, role);

    return res.status(201).json({
      success: true,
      message: 'Account created',
      data: { user: data.user },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/login
 * Authenticates a user and sets an httpOnly refresh-token cookie.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const data = await authService.login(email, password);

    // Set the refresh token in a secure httpOnly cookie
    res.cookie('refreshToken', data.refreshToken, REFRESH_COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken: data.accessToken,
        user: {
          _id: data.user._id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
        },
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/refresh
 * Issues a new access token using the refresh-token cookie.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function refresh(req, res, next) {
  try {
    const data = await authService.refreshAccessToken(req.cookies.refreshToken);

    return res.status(200).json({
      success: true,
      message: 'Token refreshed',
      data: { accessToken: data.accessToken },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/logout
 * Revokes the user's refresh token and clears the cookie.
 * Requires a valid access token (protected route).
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function logout(req, res, next) {
  try {
    await authService.logout(req.user.userId);

    res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict' });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { register, login, refresh, logout };
