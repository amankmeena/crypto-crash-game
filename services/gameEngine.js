// Game Engine
const { v4: uuidv4 } = require('uuid');
const roundModel = require('../models/roundModel');
const generateCrashPoint = require('./generateCrashPoint');
const growthFactor = 0.09;
let roundNumber = 1;
let roundID = null;
let multiplier = 1;
let roundStartTime = null;
let growthInterval = null;
let countdownInterval = null;
const multiplierListeners = [];
let recentCrashes = [];

// Initial countdown time in milliseconds
let timeLeft = 10000;
let relaxTimer = '10.0';

function formatTime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const hundredths = Math.floor((milliseconds % 1000) / 100);
  return `${String(seconds).padStart(1, '0')}.${String(hundredths).padStart(1, '0')}`;
}

function addCrash(multiplier, io) {
  recentCrashes.unshift(multiplier);
  if (recentCrashes.length > 10) recentCrashes.pop();
  io.emit('recentCrashes', recentCrashes);
}

const countdown = async (io) => {
  // Reset timer for each countdown
  timeLeft = 10000;
  relaxTimer = '10.0';
  roundNumber++;

  // Create next round in DB (n)
  try {
    const newRound = await roundModel.create({
      round_id: uuidv4(),
      round_number: roundNumber,
      crash_point: null,
      server_seed_hash: uuidv4(),
      client_seed: uuidv4(),
      nonce: Math.floor(Math.random() * 10000),
      bets: [],
      cashouts: []
    });

    io.emit('provablyFair', {
      serverSeedHash: newRound.server_seed_hash,
      clientSeed: newRound.client_seed,
      nonce: newRound.nonce
    });

    roundID = newRound.round_id;
    // console.log(`Round ${roundNumber} created in DB with roundID: ${roundID}`);

    if (countdownInterval) clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
      if (timeLeft <= 0) {
        clearInterval(countdownInterval);
        startRound(io);
      } else {
        relaxTimer = formatTime(timeLeft);
        multiplierListeners.forEach(cb => cb({ round: roundNumber, multiplier, roundID, relaxTimer }));
        timeLeft -= 10;
      }
    }, 10);
  } catch (err) {
    console.error('Error creating next round:', err);
  }
};

async function startRound(io) {
  roundStartTime = Date.now();
  // console.log("Round started at", new Date(roundStartTime));

  if (growthInterval) clearInterval(growthInterval);

  const crashNumber = generateCrashPoint('aman', roundNumber);

  try {

    await roundModel.findOneAndUpdate({ round_id: roundID }, { crash_point: crashNumber });

    // console.log(`crash point: ${crashNumber} and round: ${roundNumber} for roundID: ${roundID}`);

    growthInterval = setInterval(() => {
      multiplier = getCurrentMultiplier().toFixed(2);

      // Notify all listeners
      multiplierListeners.forEach(cb => cb({ round: roundNumber, multiplier, roundID, relaxTimer }));

      if (multiplier >= crashNumber) {
        clearInterval(growthInterval);
        addCrash(multiplier, io);
        countdown(io);
      }
    }, 100);
  } catch (error) {
    // console.log('error message: ', error.message);
  }
}

function getCurrentMultiplier() {
  const timeElapsedSec = (Date.now() - roundStartTime) / 1000;
  return Math.exp(timeElapsedSec * growthFactor);
}

const roundSheduler = async (io) => {
  // Create round 1 in DB
  try {
    const newRound = await roundModel.create({
      round_id: uuidv4(),
      round_number: 1,
      crash_point: null,
      server_seed_hash: uuidv4(),
      client_seed: uuidv4(),
      nonce: Math.floor(Math.random() * 10000),
      bets: [],
      cashouts: []
    });

    roundID = newRound.round_id;
    // console.log(`Round ${roundNumber} created in DB with roundID: ${roundID}`);

    startRound(io); // Only start the first round
  } catch (err) {
    console.error('Error creating next round:', err);
  }
}

function getMultiplier() {
  return multiplier;
}

function getRound() {
  return roundNumber;
}

function getRoundID() {
  return roundID;
}

function getRelaxTimer() {
  return relaxTimer;
}

function onMultiplierUpdate(cb) {
  multiplierListeners.push(cb);
}

module.exports = { roundSheduler, getMultiplier, getRound, getRelaxTimer, getRoundID, onMultiplierUpdate };