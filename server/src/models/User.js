'use strict';

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      // bcrypt hash stored here — never the plaintext password
    },
    role: {
      type: String,
      enum: ['admin', 'officer', 'student'],
      default: 'officer',
    },
    studentRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      default: null,
    },
    refreshTokenHash: {
      type: String,
      default: null,
      // stores bcrypt hash of the refresh token; raw token is never persisted
    },
  },
  { timestamps: true } // adds createdAt and updatedAt automatically
);

module.exports = mongoose.model('User', userSchema);
