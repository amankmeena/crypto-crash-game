const socket = io();

let player_id = null;
let round_id = null;
let maxBetPerRound = false;
let maxCashoutPerRound = false;

socket.emit('join_game');

const usdBalance = document.getElementById('usd-balance');
const currentBalance = document.getElementById('current-balance');
const btcBalance = document.getElementById('btc-balance');
const ethBalance = document.getElementById('eth-balance');

const latestBtcInUsd = document.getElementById('latest-btc-price');
const latestEthInUsd = document.getElementById('latest-eth-price');

const recentCrashesBox = document.getElementById('recent-crashes-box');
const errorMsgBox = document.getElementById('error-msg-box');
const successMsgBox = document.getElementById('success-msg-box');

const cashoutBtn = document.getElementById('cashoutButton');
const betBtn = document.getElementById('betButton');

const roundNumber = document.getElementById('roundNumber');
const multiplier = document.getElementById('multiplier');
const roundRelaxTimer = document.getElementById('roundRelaxTimer');
const onlinePlayers = document.getElementById('online-players');

const serverSeedBox = document.getElementById('server-seed-box');
const clientSeedBox = document.getElementById('client-seed-box');
const nonceBox = document.getElementById('nonce-box');

function bidBtnFunction(timer) {
    if (maxCashoutPerRound) {
        cashoutBtn.disabled = true;
    } else if (timer > 0) {
        cashoutBtn.disabled = true;
    } else {
        cashoutBtn.disabled = false;
    }

    if (maxBetPerRound) {
        betBtn.disabled = true;
    } else if (timer > 0) {
        betBtn.disabled = false;
    } else {
        betBtn.disabled = true;
    }
}

function showError(errMsg) {
    // Show error message
    errorMsgBox.textContent = errMsg || "Transaction failed. Contact to support team.";
    errorMsgBox.classList.remove('hidden');
    errorMsgBox.classList.add('visible');
    setTimeout(function () {
        errorMsgBox.classList.remove('visible');
        errorMsgBox.classList.add('hidden');
    }, 2000);
}

function showSuccess(successMsg) {
    successMsgBox.textContent = successMsg || "Hi there!";
    successMsgBox.classList.remove('hidden');
    successMsgBox.classList.add('visible');
    setTimeout(function () {
        successMsgBox.classList.remove('visible');
        successMsgBox.classList.add('hidden');
    }, 2000);
}

socket.on('player_joined', function (data) {
    showSuccess(`Player ${data.username} joined.`);
});

socket.on('player_info', function (data) {
    const { newPlayer: player } = data;

    player_id = player.player_id;

    usdBalance.innerText = '$' + player.usdWallet.toFixed(2);
    currentBalance.innerText = '$' + player.usdWallet.toFixed(2);
    btcBalance.innerText = player.cryptoWallet.BTC + ' BTC';
    ethBalance.innerText = player.cryptoWallet.ETH + ' ETH';
});

socket.on('game_state', data => {
    roundNumber.innerText = data.round;
    multiplier.innerText = data.multiplier;
    roundRelaxTimer.innerText = data.relaxTimer + 's';
    onlinePlayers.innerText = data.connectedPlayers

    if (round_id != data.roundID) {
        maxBetPerRound = false;
        maxCashoutPerRound = false;
    }
    round_id = data.roundID;

    bidBtnFunction(data.relaxTimer);
});

socket.on('multiplierUpdate', data => {
    roundNumber.innerText = data.round;
    multiplier.innerText = data.multiplier;
    roundRelaxTimer.innerText = data.relaxTimer + 's';
    onlinePlayers.innerText = data.connectedPlayers;

    if (round_id != data.roundID) {
        maxBetPerRound = false;
        maxCashoutPerRound = false;
    }
    round_id = data.roundID;

    bidBtnFunction(data.relaxTimer);
});

socket.on('recent_crashes', function (crashes) {
    recentCrashesBox.innerHTML = '';

    crashes.forEach(mult => {
        const badge = document.createElement('span');
        if (mult < 2) {
            badge.className = 'badge cc-badge-red';
        } else if (mult >= 2 && mult < 5) {
            badge.className = 'badge cc-badge-green';
        } else if (mult >= 5 && mult < 10) {
            badge.className = 'badge cc-badge-blue';
        } else {
            badge.className = 'badge cc-badge-light';
        }
        badge.textContent = mult + 'X';
        recentCrashesBox.appendChild(badge);
    });
});

socket.on('provablyFair', function (data) {
    serverSeedBox.textContent = data.serverSeedHash;
    clientSeedBox.textContent = data.clientSeed;
    nonceBox.textContent = data.nonce;
});

socket.on('player_left', function (data) {
    showSuccess(`Player ${data.username} left.`);
    onlinePlayers.innerText = data.connectedPlayers;
});

socket.on('player_not_initialized', function (data) {
    if (data.success) {
        showSuccess("Player initialized successfully!");
    } else {
        showError(data.errMsg);
    }
});

// socket.on('crypto_prices', function (data) {
//     const { btcPrice, ethPrice} = data;

//     latestBtcInUsd.innerText = '$' + btcPrice.toFixed(2);
//     latestEthInUsd.innerText = '$' + ethPrice.toFixed(2);
// })

// document.getElementById('placeBetForm').addEventListener('submit', function (e) {
//     e.preventDefault();

//     const form = e.target;
//     const formData = new FormData(form);
//     const data = Object.fromEntries(formData.entries());

//     // Convert specific fields to numbers
//     if (data.betAmount) data.betAmount = Number(data.betAmount);

//     fetch('/player/placeBet', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ ...data, playerId: player_id, roundId: round_id })
//     })
//         .then(res => res.json())
//         .then(data => {
//             if (data.success) {
//                 const { player } = data;

//                 usdBalance.innerText = '$' + player.usdWallet;
//                 currentBalance.innerText = '$' + player.usdWallet;
//                 btcBalance.innerText = player.cryptoWallet.BTC + ' BTC';
//                 ethBalance.innerText = player.cryptoWallet.ETH + ' ETH';

//                 maxBetPerRound = true;
//             } else {
//                 showError(data.errMsg);
//             }
//         })
//         .catch(err => {
//             showError(err.message);
//         })
// })

// cashoutBtn.addEventListener('click', () => {

//     const data = {
//         cashoutPoint: Number(multiplier.innerText),
//         roundId: round_id,
//         playerId: player_id
//     }

//     fetch('/player/cashout', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(data)
//     })
//         .then(res => res.json())
//         .then(data => {
//             if (data.success) {
//                 const { player } = data;

//                 usdBalance.innerText = '$' + player.usdWallet;
//                 currentBalance.innerText = '$' + player.usdWallet;
//                 btcBalance.innerText = player.cryptoWallet.BTC + ' BTC';
//                 ethBalance.innerText = player.cryptoWallet.ETH + ' ETH';

//                 maxCashoutPerRound = true;
//             } else {
//                 showError(data.errMsg);
//             }
//         })
//         .catch(err => {
//             showError(err.message);
//         })
// })

// Listen for bet result
socket.on('bet_result', function (data) {
    if (data.success) {
        const { player } = data;
        usdBalance.innerText = '$' + player.usdWallet.toFixed(2);
        currentBalance.innerText = '$' + player.usdWallet.toFixed(2);
        btcBalance.innerText = player.cryptoWallet.BTC + ' BTC';
        ethBalance.innerText = player.cryptoWallet.ETH + ' ETH';
        maxBetPerRound = true;
        showSuccess("Bet placed successfully!");
    } else {
        showError(data.errMsg);
    }
});

// Listen for cashout result
socket.on('cashout_result', function (data) {
    if (data.success) {
        const { player } = data;
        usdBalance.innerText = '$' + player.usdWallet.toFixed(2);
        currentBalance.innerText = '$' + player.usdWallet.toFixed(2);
        btcBalance.innerText = player.cryptoWallet.BTC + ' BTC';
        ethBalance.innerText = player.cryptoWallet.ETH + ' ETH';
        maxCashoutPerRound = true;
        showSuccess("Cashout successful!");
    } else {
        showError(data.errMsg);
    }
});

document.getElementById('placeBetForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    if (data.betAmount) data.betAmount = Number(data.betAmount);

    socket.emit('place_bet', { ...data, playerId: player_id, roundId: round_id });
});

cashoutBtn.addEventListener('click', () => {
    const data = {
        cashoutPoint: Number(multiplier.innerText),
        roundId: round_id,
        playerId: player_id
    };

    socket.emit('cashout', data);
});