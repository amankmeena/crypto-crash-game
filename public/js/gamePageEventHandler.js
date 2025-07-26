const socket = io();

let player_id = null;
let round_id = null;
let maxBetPerRound = false;
let maxCashoutPerRound = false;

const usdBalance = document.getElementById('usd-balance');
const currentBalance = document.getElementById('current-balance');
const btcBalance = document.getElementById('btc-balance');
const ethBalance = document.getElementById('eth-balance');

const recentCrashesBox = document.getElementById('recent-crashes-box');
const errorMsgBox = document.getElementById('error-msg-box');

const cashoutBtn = document.getElementById('cashoutButton');
const betBtn = document.getElementById('betButton');

const roundNumber = document.getElementById('roundNumber');
const multiplier = document.getElementById('multiplier');
const roundRelaxTimer = document.getElementById('roundRelaxTimer');

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
    errorMsgBox.textContent = errMsg || "Bet failed";
    errorMsgBox.classList.remove('hidden');
    errorMsgBox.classList.add('visible');
    setTimeout(function () {
        errorMsgBox.classList.remove('visible');
        errorMsgBox.classList.add('hidden');
    }, 2000);
}

const player = JSON.parse(localStorage.getItem('player'));
if (player) {
    socket.emit('playerJoined', player);
    // localStorage.removeItem('player');
}

socket.on('playerUpdate', function (data) {
    player_id = data.player_id;
    // console.log('player update data socet: ', data)

    usdBalance.innerText = '$' + player.usdWallet;
    currentBalance.innerText = '$' + player.usdWallet;
    btcBalance.innerText = player.cryptoWallet.BTC + ' BTC';
    ethBalance.innerText = player.cryptoWallet.ETH + ' ETH';
});

socket.on('gameState', data => {
    roundNumber.innerText = data.round;
    multiplier.innerText = data.multiplier;
    roundRelaxTimer.innerText = data.relaxTimer + 's';

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

    if (round_id != data.roundID) {
        maxBetPerRound = false;
        maxCashoutPerRound = false;
    }
    round_id = data.roundID;

    bidBtnFunction(data.relaxTimer);
});

socket.on('recentCrashes', function (crashes) {
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

socket.on('provablyFair', function(data) {
  serverSeedBox.textContent = data.serverSeedHash;
  clientSeedBox.textContent = data.clientSeed;
  nonceBox.textContent = data.nonce;
});

document.getElementById('placeBetForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Convert specific fields to numbers
    if (data.betAmount) data.betAmount = Number(data.betAmount);

    fetch('/player/placeBet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, playerId: player_id, roundId: round_id })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const { player } = data;

                usdBalance.innerText = '$' + player.usdWallet;
                currentBalance.innerText = '$' + player.usdWallet;
                btcBalance.innerText = player.cryptoWallet.BTC + ' BTC';
                ethBalance.innerText = player.cryptoWallet.ETH + ' ETH';

                maxBetPerRound = true;
            } else {
                showError(data.errMsg);
            }
        })
        .catch(err => {
            showError(err.message);
        })
})

cashoutBtn.addEventListener('click', () => {

    const data = {
        cashoutPoint: Number(multiplier.innerText),
        roundId: round_id,
        playerId: player_id
    }

    fetch('/player/cashout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const { player } = data;

                usdBalance.innerText = '$' + player.usdWallet;
                currentBalance.innerText = '$' + player.usdWallet;
                btcBalance.innerText = player.cryptoWallet.BTC + ' BTC';
                ethBalance.innerText = player.cryptoWallet.ETH + ' ETH';

                maxCashoutPerRound = true;
            } else {
                showError(data.errMsg);
            }
        })
        .catch(err => {
            showError(err.message);
        })
})