# Crypto Crash Backend

## Overview

Crypto Crash is a backend implementation of the "Crash" game, where players bet in USD, converted to cryptocurrency (BTC/ETH) using real-time prices. Players watch a multiplier increase and can cash out before the game "crashes." The backend handles game logic, crypto integration, and real-time updates via Socket.io.

---

## Features

- **Crash Game Logic**
  - Rounds start every 10 seconds.
  - Multiplier increases exponentially; game crashes at a provably fair random point.
  - Players bet in USD, converted to BTC/ETH at real-time prices.
  - Cash out before crash to win; lose bet if not cashed out in time.
  - Game state, bets, cashouts, and round history stored in MongoDB.

- **Cryptocurrency Integration**
  - Real-time price fetching from CoinGecko API.
  - USD-to-crypto conversion at bet time.
  - Simulated player wallets for BTC/ETH.
  - Transaction logs for bets and cashouts, including mock transaction hashes.

- **WebSockets**
  - Real-time updates for round start, multiplier changes, cashouts, and crashes.
  - Players receive live game state and can send cashout requests via WebSocket.

---

## Project Structure

```
.env.local
Assgnment.md
package.json
README.md
server.js
configs/
  db.js
controllers/
  playerController.js
models/
  playerModel.js
  roundModel.js
  transactionModel.js
public/
  css/
  images/
  js/
    gamePageEventHandler.js
routes/
  playerRouter.js
services/
  cryptoService.js
  gameEngine.js
  generateCrashPoint.js
sockets/
utils/
  requireAuth.js
views/
  gamePage.ejs
  index.ejs
  loginPage.ejs
```

---

## Setup Instructions

1. **Clone the repository:**
   ```sh
   git clone <your-repo-url>
   cd Crypto Crash
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Configure environment variables:**
   - Copy `.env.local` and set:
     - `COINGECKO_API_KEY` (CoinGecko API key)
     - `MONGO_URI` (MongoDB connection string)
     - `SESSION_SECRET_KEY` (session secret)

4. **Start the server:**
   ```sh
   npm start
   ```
   - Server runs on port `8000`.

---

## API Endpoints

### Player Actions

- **Sign Up:**  
  `POST /createPlayer`  
  - Request: `{ signupUsername }`
  - Response: `{ success, player }`

- **Login:**  
  `POST /loginPlayer`  
  - Request: `{ loginUsername }`
  - Response: `{ success, player }`

- **Place Bet:**  
  `POST /player/placeBet`  
  - Request: `{ betAmount, cryptoTypeSymbol, roundId, playerId }`
  - Response: `{ success, player }`

- **Cash Out:**  
  `POST /player/cashout`  
  - Request: `{ cashoutPoint, roundId, playerId }`
  - Response: `{ success, player }`

- **Check Wallet:**  
  `POST /player/wallet/:player_id`  
  - Response: Wallet info (to be implemented)

---

## WebSocket Events

- **gameState**  
  - Sent on connect: `{ round, multiplier, roundID, relaxTimer }`

- **multiplierUpdate**  
  - Sent every 100ms: `{ round, multiplier, roundID, relaxTimer }`

- **recentCrashes**  
  - Sent on crash: `[multiplier, ...]`

- **provablyFair**  
  - Sent each round: `{ serverSeedHash, clientSeed, nonce }`

- **playerUpdate**  
  - Sent on player join: `{ player_id, ... }`

---

## Provably Fair Crash Algorithm

- Implemented in [`services/generateCrashPoint.js`](services/generateCrashPoint.js).
- Uses SHA256 hash of seed + round number, normalized and exponentiated for crash point.
- Server and client seeds, nonce are shown in UI for verification.

---

## USD-to-Crypto Conversion

- Real-time prices fetched from CoinGecko (see [`services/cryptoService.js`](services/cryptoService.js)).
- Conversion:  
  - Bet: `usd / price`
  - Cashout: `crypto * multiplier`
  - USD equivalent: `crypto * price_at_time`

---

## Database Models

- [`models/playerModel.js`](models/playerModel.js): Player info and wallet.
- [`models/roundModel.js`](models/roundModel.js): Round history, crash point, bets, cashouts.
- [`models/transactionModel.js`](models/transactionModel.js): Bet/cashout transactions.

---

## Sample Data

To populate the database with sample players and rounds, use the signup page or create entries via MongoDB shell.

---

## Testing

- Use Postman or cURL for API endpoints.
- Use the provided EJS pages and [`public/js/gamePageEventHandler.js`](public/js/gamePageEventHandler.js) for WebSocket client testing.

---

## Notes

- All crypto transactions are simulated; no real blockchain interaction.
- Price API is cached for 10 seconds to avoid rate limits.
- Session-based authentication for protected routes.
- Error handling and input validation implemented for core actions.

---

## License

ISC

---

## Author

Aman Meena