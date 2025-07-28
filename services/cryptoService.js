const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.COINGECKO_API_KEY;
// const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&per_page=10';
const url = process.env.COINGECKO_PATH_URL;

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
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/json'
            }
        });

        // const response = await axios.get(url);
        // for (const element of response.data) {
        //     data.push({
        //         id: element.id,
        //         symbol: element.symbol,
        //         name: element.name,
        //         image: element.image,
        //         current_price: element.current_price,
        //     })
        // }

        lastFetched = now;
        priceCache = {
            BTC: response.data.bitcoin.usd,
            ETH: response.data.ethereum.usd
        };

        return priceCache[symbol];
    } catch (error) {
        console.error('Error fetching prices:', error.message);
        // Return a fallback value or throw error for handling in calling code
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