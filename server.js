const express = require('express');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const socketIo = require('socket.io');
const playerRouter = require('./routes/playerRouter');
const playerModel = require('./models/playerModel');

const { roundSheduler, getMultiplier, getRound, getRelaxTimer, getRoundID, onMultiplierUpdate } = require('./services/gameEngine');
const { getCryptoPrice, usdToCrypto, cryptoToUsd } = require('./services/cryptoService');
const requireAuth = require('./utils/requireAuth');

// Connecting to DB
require('./configs/db');
require('dotenv').config({ path: '.env.local' })

const app = express();
app.use(session({
  secret: process.env.SESSION_SECRET_KEY,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));
const server = http.createServer(app);
const io = socketIo(server);
const port = 8000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.set('view engine', 'ejs');
app.use('/player', playerRouter);

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/login', (req, res) => {
  res.render('loginPage');
});

app.get('/gamePage', requireAuth, (req, res) => {
  res.render('gamePage');
});

app.post('/createPlayer', async (req, res) => {
  const username = req.body.signupUsername;
  const playerExists = await playerModel.findOne({ player_username: username });
  if (playerExists) {
    return res.json({ success: false, errMsg: "Player already exists. Try another..." });
  }

  try {
    const btcPrice = await getCryptoPrice('BTC');
    const ethPrice = await getCryptoPrice('ETH');

    const newPlayer = await playerModel.create({
      player_username: username,
      player_id: uuidv4(),
      usdWallet: 1000,
      cryptoWallet: {
        BTC: usdToCrypto(1000, btcPrice),
        ETH: usdToCrypto(1000, ethPrice)
      },
    });

    // console.log('player created successfully');

    req.session.player = newPlayer;
    return res.json({ success: true, player: newPlayer });
  } catch (error) {
    // console.log('Unknown error: ', error.message);
    return res.json({ success: false, errMsg: "Unknown error. Try again." });
  }
});

app.post('/loginPlayer', async (req, res) => {
  const username = req.body.loginUsername;

  const playerFound = await playerModel.findOne({ player_username: username });
  if (!playerFound) {
    return res.json({ success: false, errMsg: "Player not found. Try again..." });
  }

  // console.log('player found successfully');

  req.session.player = playerFound;
  return res.json({ success: true, player: playerFound });
});

io.on('connection', (socket) => {
  // Send current state on connect
  socket.emit('gameState', { round: getRound(), multiplier: getMultiplier(), roundID: getRoundID(), relaxTimer: getRelaxTimer() });

  socket.on('playerJoined', (playerData) => {
    socket.emit('playerUpdate', playerData);
  });

  // Listen for multiplier updates
  onMultiplierUpdate((data) => {
    socket.emit('multiplierUpdate', data);
  });
});

server.listen(port, () => {
  console.log(`Server listening on port: ${port}`);
});

roundSheduler(io);