const crypto = require('crypto');

function generateCrashPoint(seed, roundNumber, maxCrash = 100) {
   const hash = crypto.createHash('sha256').update(seed + roundNumber).digest('hex');
   const intVal = parseInt(hash.slice(0, 13), 16) / 0xfffffffffffff; // normalize to 0-1

   const exponent = 4; // bigger exponent = more early crashes
   const crash = Math.pow(1 / (1 - intVal), 1 / exponent);

   return Math.min(100, Math.max(1.00, parseFloat(crash.toFixed(2))));
}

module.exports = generateCrashPoint;