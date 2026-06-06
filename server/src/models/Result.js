'use strict';

const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InterviewSession',
    required: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  roundNumber: {
    type: Number,
    required: true,
  },
  outcome: {
    type: String,
    enum: ['pass', 'fail', 'offer', 'pending'],
    default: 'pending',
  },
  remarks: {
    type: String,
  },
  recordedAt: {
    type: Date,
    default: Date.now,
  },
});

resultSchema.index({ session: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('Result', resultSchema);
