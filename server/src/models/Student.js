'use strict';

const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: true,
      unique: true,
    },
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
    phone: {
      type: String,
      required: true,
      match: [/^\d{10}$/, 'Phone must be exactly 10 digits'],
    },
    branch: {
      type: String,
      required: true,
      enum: ['CSE', 'ECE', 'ME', 'CE', 'EE', 'IT'],
    },
    year: {
      type: Number,
      required: true,
      min: 1,
      max: 4,
    },
    cgpa: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
    },
    resumeUrl: {
      type: String,
    },
    placementStatus: {
      type: String,
      enum: ['not_placed', 'in_process', 'placed', 'rejected'],
      default: 'not_placed',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

studentSchema.index({ isDeleted: 1, branch: 1, placementStatus: 1 });

module.exports = mongoose.model('Student', studentSchema);
