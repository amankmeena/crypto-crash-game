const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.COINGECKO_API_KEY;
// const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&per_page=10';
const url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd';

let priceCache = {};
let data = [];
let lastFetched = 0;

async function getCryptoPrice(symbol) {
    const now = Date.now();

    if ((now - lastFetched < 10000) && (priceCache[symbol])) {
        return priceCache[symbol];
    }

    const response = await axios.get(url);

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
}

function usdToCrypto(usd, price) {
    return usd / price;
}

function cryptoToUsd(crypto, price) {
    return crypto * price;
}

module.exports = { getCryptoPrice, usdToCrypto, cryptoToUsd };