const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.COINCAP_API_KEY;
const url = process.env.COINCAP_PATH_URL;

let priceCache = {};
let data = [];
let lastFetched = 0;

async function getCryptoPrice(symbol) {
    const now = Date.now();

    if ((now - lastFetched < 10000) && (priceCache[symbol])) {
        return priceCache[symbol];
    }

    try {
        const response = await axios.get(url, {
            headers: {
                'accept': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
        });

        lastFetched = now;
        for (const currency of response.data.data) {
            if (currency.id == 'bitcoin') {
                priceCache.BTC = Number(currency.priceUsd).toFixed(2)
            } else if (currency.id == 'ethereum') {
                priceCache.ETH = Number(currency.priceUsd).toFixed(2)
            }
        }

        return priceCache[symbol];
    } catch (error) {
        console.error('Error fetching prices:', error.message);
        throw new Error('Failed to fetch crypto prices');
    }
}

function usdToCrypto(usd, price) {
    return usd / price;
}

function cryptoToUsd(crypto, price) {
    return crypto * price;
}

module.exports = { getCryptoPrice, usdToCrypto, cryptoToUsd };