'use strict';

const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    roundNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    roundName: {
      type: String,
      required: true,
    },
    roundType: {
      type: String,
      required: true,
      enum: ['aptitude', 'technical', 'coding', 'gd', 'hr'],
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    venue: {
      type: String,
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'],
      default: 'scheduled',
    },
  },
  { timestamps: true }
);

sessionSchema.index({ company: 1, scheduledDate: -1 });

module.exports = mongoose.model('InterviewSession', sessionSchema);
