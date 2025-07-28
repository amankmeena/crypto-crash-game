const express = require('express');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const socketIo = require('socket.io');
const playerRouter = require('./routes/playerRouter');
const playerModel = require('./models/playerModel');

const { roundSheduler, getMultiplier, getRound, getRelaxTimer, getRoundID, onMultiplierUpdate } = require('./services/gameEngine');
const { getCryptoPrice, usdToCrypto, cryptoToUsd } = require('./services/cryptoService');
const roundModel = require('./models/roundModel');
const transactionModel = require('./models/transactionModel');

// Connecting to DB
require('./configs/db');
require('dotenv').config({ path: '.env.local' })

const app = express();
app.use(session({
  secret: process.env.SESSION_SECRET_KEY,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}));
const server = http.createServer(app);
const io = socketIo(server);
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.set('view engine', 'ejs');
app.use('/player', playerRouter);

app.get('/', (req, res) => {
  res.render('index');
});

let connectedPlayers = 0;
let gameLoop = null;

io.on('connection', (socket) => {

  connectedPlayers++;
  console.log("Player connected. Total:", connectedPlayers);

  socket.on('join_game', async () => {
    const btcPrice = await getCryptoPrice('BTC');
    const ethPrice = await getCryptoPrice('ETH');

    const newPlayer = await playerModel.create({
      player_username: uuidv4(),
      player_id: socket.id,
      usdWallet: 10000,
      cryptoWallet: {
        BTC: usdToCrypto(10000, btcPrice),
        ETH: usdToCrypto(10000, ethPrice)
      },
    });

    // Save player reference
    socket.data.playerUsername = newPlayer.player_username;
    socket.data.playerId = newPlayer._id;

    // Notify all players 
    socket.broadcast.emit('player_joined', { username: newPlayer.player_username });

    // Send player info
    socket.emit('player_info', { newPlayer });

    // Send current state on connect
    socket.emit('game_state', { round: getRound(), multiplier: getMultiplier(), roundID: getRoundID(), relaxTimer: getRelaxTimer(), connectedPlayers });
  });

  if (!gameLoop) {
    gameLoop = roundSheduler(io);
  }

  // Listen for multiplier updates
  onMultiplierUpdate((data) => {
    socket.emit('multiplierUpdate', { ...data, connectedPlayers });
  });

  socket.on('place_bet', async (data) => {
    try {
      const { betAmount, cryptoTypeSymbol, roundId, playerId } = data;

      const player = await playerModel.findOne({ player_id: playerId });
      if (!player) throw new Error("Player not found. Bet not placed.");

      const round = await roundModel.findOne({ round_id: roundId });
      if (!round) throw new Error("Round not found. Bet not placed.");

      const symbol = cryptoTypeSymbol.toUpperCase();
      const cryptoPrice = await getCryptoPrice(symbol);

      const betAmountInCrypto = usdToCrypto(betAmount, cryptoPrice);

      const newBetTransaction = await transactionModel.create({
        transaction_id: uuidv4(),
        playerID: player._id,
        roundID: round._id,
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

      socket.emit('bet_result', { success: true, player });
    } catch (err) {
      socket.emit('bet_result', { success: false, errMsg: err.message });
    }
  });

  socket.on('cashout', async (data) => {
    try {
      const { cashoutPoint, roundId, playerId } = data;

      const player = await playerModel.findOne({ player_id: playerId });
      if (!player) throw new Error("Player not found. Cashout failed. Contact to our support team.");

      const round = await roundModel.findOne({ round_id: roundId });
      if (!round) throw new Error("Round not found. Cashout failed. Contact to our support team.");

      if (!(cashoutPoint < round.crash_point)) {
        socket.emit('cashout_result', { success: false, errMsg: "You lost the bet. Can't cashout money." });
        return;
      }

      const betTransaction = await transactionModel.findOne({ playerID: player._id, roundID: round._id, transaction_type: 'bet' });
      if (!betTransaction) throw new Error("Bet not found. Contact to our support team.");

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

      socket.emit('cashout_result', { success: true, player });
    } catch (err) {
      socket.emit('cashout_result', { success: false, errMsg: err.message });
    }
  });

  socket.on("disconnect", async () => {
    connectedPlayers--;
    console.log("Player disconnected. Total:", connectedPlayers);

    // Remove player from DB
    await playerModel.findByIdAndDelete(socket.data.playerId);

    // Find all transaction IDs for this player
    const playerTransactions = await transactionModel.find({ playerID: socket.data.playerId }, '_id');
    const transactionIds = playerTransactions.map(tx => tx._id);

    // Remove these transactions from bets and cashouts arrays in all rounds from DB
    await roundModel.updateMany(
      {},
      {
        $pull: {
          bets: { $in: transactionIds },
          cashouts: { $in: transactionIds }
        }
      }
    );

    // Remove all transactions of the player from DB
    await transactionModel.deleteMany({ playerID: socket.data.playerId });

    io.emit('player_left', { username: socket.data.playerUsername, connectedPlayers });

    if (connectedPlayers === 0 && gameLoop) {
      clearInterval(gameLoop);
      gameLoop = null;

      await roundModel.deleteMany();

      console.log("Game loop stopped: no players");
    }
  });
});

server.listen(port, () => {
  console.log(`Server listening on port: ${port}`);
});