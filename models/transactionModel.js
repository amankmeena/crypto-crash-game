const mongoose = require('mongoose');
const { Schema } = mongoose;

const transactionSchema = new Schema({
    transaction_id: String,
    playerID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'player'
    },
    amount: {
        usd: { type: Number, default: 0},
        crypto: { type: Number, default: 0},
    },
    currency: String,
    transaction_type: { type: String, enum: ['bet', 'cashout'], default: 'undefined' },
    transaction_hash: String,
    price_at_time: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('transaction', transactionSchema);