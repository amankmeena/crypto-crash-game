# Crypto Crash Backend

## Overview

Crypto Crash is a backend implementation of the "Crash" game, where players bet in USD, converted to cryptocurrency (BTC/ETH) using real-time prices. Players watch a multiplier increase and can cash out before the game "crashes." The backend handles game logic, crypto integration, and real-time updates via Socket.io.

---

## Real-Time Game Actions via Socket.io (No REST API)

All core game actions are handled via **Socket.io events** instead of REST API calls. This ensures low latency and instant updates for all players.

### 1. Routes Handling by Sockets (Not API Calls)

#### Joining the Game
- The client emits a `join_game` event via Socket.io.
- The server:
  - Creates a new player in the database.
  - Initializes their wallets with USD and crypto.
  - Notifies all other players of the new join via `player_joined`.
  - Sends the new player their info (`player_info`) and the current game state (`game_state`).

#### Placing a Bet
- The client emits a `place_bet` event with bet details.
- The server:
  - Validates the player and round.
  - Creates a bet transaction in the database.
  - Updates the round and player wallets.
  - Responds with `bet_result`.

#### Cashing Out
- The client emits a `cashout` event.
- The server:
  - Validates the player, round, and bet.
  - Creates a cashout transaction.
  - Updates the round and player wallets.
  - Responds with `cashout_result`.

#### Leaving the Game (Disconnect)
- When a player disconnects, the server:
  - Removes the player from the database.
  - Removes all their transactions.
  - Removes their bets and cashouts from all rounds.
  - Notifies all players via `player_left`.
  - If no players remain, deletes all rounds and stops the game loop.

> **Note:** No REST API endpoints are used for these actions; everything is handled in real-time via Socket.io events.

---

### 2. Database Management on Player Connection and Disconnection

#### On Player Connection
- A new player document is created in the database with a unique username, socket ID, and initialized wallets.
- The player’s info is stored in `socket.data` for quick access during their session.

#### On Player Disconnection
- The player’s document is deleted from the database.
- All transactions (bets and cashouts) associated with the player are deleted.
- All rounds are updated to remove references to the player’s transactions in their `bets` and `cashouts` arrays.
- If the last player disconnects:
  - The game loop is stopped.
  - All round documents are deleted, resetting the game state.

---

### Summary Table

| Action      | How Handled (Socket Event) | DB Operations                                                      |
|-------------|----------------------------|--------------------------------------------------------------------|
| Join Game   | `join_game`                | Create player, initialize wallets, store in `socket.data`          |
| Place Bet   | `place_bet`                | Validate, create transaction, update round & player wallets        |
| Cashout     | `cashout`                  | Validate, create transaction, update round & player wallets        |
| Disconnect  | `disconnect`               | Delete player, remove transactions, update rounds, cleanup if last |

---

## Features

- **Crash Game Logic**
  - Rounds start every 10 seconds.
  - Multiplier increases exponentially; game crashes at a provably fair random point.
  - Players bet in USD, converted to BTC/ETH at real-time prices.
  - Cash out before crash to win; lose bet if not cashed out in time.
  - Game state, bets, cashouts, and round history stored in MongoDB.

- **Cryptocurrency Integration**
  - Real-time price fetching from CoinCap API.
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
views/
  index.ejs
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
     - `COINCAP_API_KEY` (CoinCap API key)
     - `COINCAP_PATH_URL` (CoinCap path url)
     - `MONGO_URI` (MongoDB connection string)
     - `SESSION_SECRET_KEY` (session secret)

4. **Start the server:**
   ```sh
   npm start
   ```
   - Server runs on port `3000`.

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

- Real-time prices fetched from CoinCap (see [`services/cryptoService.js`](services/cryptoService.js)).
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

## Testing

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