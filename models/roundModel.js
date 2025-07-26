const mongoose = require('mongoose');
const { Schema } = mongoose;

const roundSchema = new Schema({
    round_id: String,
    round_number: Number,
    crash_point: Number,
    server_seed_hash: String,
    client_seed: String,
    nonce: Number,
    bets: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'transaction'
        }
    ],
    cashouts: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'transaction'
        }
    ]
});

module.exports = mongoose.model('round', roundSchema);