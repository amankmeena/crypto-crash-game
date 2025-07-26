const { v4: uuidv4 } = require('uuid');
const playerModel = require('../models/playerModel');
const roundModel = require('../models/roundModel');
const transactionModel = require('../models/transactionModel');
const { getCryptoPrice, usdToCrypto, cryptoToUsd } = require('../services/cryptoService');

module.exports.betController = async (req, res) => {
    const { betAmount, cryptoTypeSymbol, roundId, playerId } = req.body;

    const player = await playerModel.findOne({ player_id: playerId })
    if (!player) {
        return res.status(404).json({ errMsg: "Player not found. Bet not placed." });
    }

    const round = await roundModel.findOne({ round_id: roundId })
    if (!round) {
        return res.status(404).json({ errMsg: "Round not found. Bet not placed." });
    }

    try {
        const symbol = cryptoTypeSymbol.toUpperCase();
        const cryptoPrice = await getCryptoPrice(symbol);

        const betAmountInCrypto = usdToCrypto(betAmount, cryptoPrice);

        const newBetTransaction = await transactionModel.create({
            transaction_id: uuidv4(),
            playerID: player._id,
            amount: {
                usd: betAmount,
                crypto: betAmountInCrypto
            },
            currency: symbol,
            transaction_type: 'bet',
            transaction_hash: uuidv4(),
            price_at_time: cryptoPrice,
        });

        round.bets.push(newBetTransaction._id);
        await round.save();

        player.usdWallet -= betAmount;
        player.cryptoWallet[symbol] -= betAmountInCrypto;
        await player.save();

        return res.json({ success: 'bet done', player })
    } catch (error) {
        return res.status(401).json({ errMsg: error.message })
    }
}

module.exports.cashoutController = async (req, res) => {
    const { cashoutPoint, roundId, playerId } = req.body;

    const player = await playerModel.findOne({ player_id: playerId })
    if (!player) {
        return res.status(404).json({ errMsg: "Player not found. Cashout failed. Contact to our support team." });
    }

    const round = await roundModel.findOne({ round_id: roundId })
    if (!round) {
        return res.status(404).json({ errMsg: "Round not found. Cashout failed. Contact to our support team." });
    }

    try {

        if (!(cashoutPoint < round.crash_point)) {
            return res.json({ success: "You lost the bet. Can't cashout money." })
        }

        const betTransaction = await transactionModel.findOne({ playerID: player._id });
        if (!betTransaction) {
            return res.status(404).json({ errMsg: "Bet not found. Contact to our support team." })
        }

        const symbol = betTransaction.currency.toUpperCase();

        const cashoutAmountInCrypto = cashoutPoint * betTransaction.amount.crypto;

        const cashoutAmountInUsd = cryptoToUsd(cashoutAmountInCrypto, betTransaction.price_at_time);

        const newCashoutTransaction = await transactionModel.create({
            transaction_id: uuidv4(),
            playerID: player._id,
            amount: {
                usd: cashoutAmountInUsd,
                crypto: cashoutAmountInCrypto
            },
            currency: symbol,
            transaction_type: 'cashout',
            transaction_hash: uuidv4(),
            price_at_time: betTransaction.price_at_time,
        });

        round.cashouts.push(newCashoutTransaction._id);
        await round.save();

        player.usdWallet += cashoutAmountInUsd;
        player.cryptoWallet[symbol] += cashoutAmountInCrypto;
        await player.save();

        return res.json({ success: 'cashout done', player })

    } catch (error) {
        return res.status(401).json({ errMsg: error.message })
    }
}