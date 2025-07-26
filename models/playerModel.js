const mongoose = require('mongoose');
const { Schema } = mongoose;

const playerSchema = new Schema({
    player_username: {
        type: String,
        required: true
    },
    player_id: String,
    cryptoWallet: {
        BTC: { type: Number, default: 0 },
        ETH: { type: Number, default: 0 }
    },
    usdWallet: { type: Number, default: 0 }
});

module.exports = mongoose.model('player', playerSchema);