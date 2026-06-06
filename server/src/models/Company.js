'use strict';

const mongoose = require('mongoose');

const roundSchema = new mongoose.Schema({
  roundNumber: { type: Number, required: true },
  roundName:   { type: String, required: true, trim: true },
  roundType:   { type: String, required: true, enum: ['aptitude', 'technical', 'coding', 'gd', 'hr'] },
  description: { type: String },
});

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    industry: {
      type: String,
    },
    website: {
      type: String,
    },
    ctc: {
      type: Number,
      min: 0,
    },
    location: {
      type: String,
    },
    rounds: {
      type: [roundSchema],
      default: [],
    },
    recruitmentStatus: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed'],
      default: 'upcoming',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Company', companySchema);
