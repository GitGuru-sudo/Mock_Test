'use strict';

const mongoose = require('mongoose');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

/**
 * Connect to MongoDB with retry logic.
 * Retries up to MAX_RETRIES times with a RETRY_DELAY_MS delay between attempts.
 * Exits the process only after all retries are exhausted.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('MONGODB_URI environment variable is not set.');
    process.exit(1);
  }

  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    attempt++;
    try {
      const conn = await mongoose.connect(uri);
      console.log(`MongoDB connected: ${conn.connection.host}`);

      // Handle disconnect events and attempt reconnect
      mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected. Attempting to reconnect...');
        setTimeout(() => connectDB(), RETRY_DELAY_MS);
      });

      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err.message);
      });

      return; // Connection successful — exit the retry loop
    } catch (err) {
      console.error(`MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);

      if (attempt >= MAX_RETRIES) {
        console.error('All MongoDB connection retries exhausted. Exiting.');
        process.exit(1);
      }

      console.log(`Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
};

module.exports = connectDB;
