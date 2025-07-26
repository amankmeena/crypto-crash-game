const mongoose = require('mongoose');
require('dotenv').config({path: '.env.local'});

const URL = process.env.MONGO_URI;

mongoose.connect(URL).then(() => {
    console.log('DB connected.')
}).catch((err) => {
    console.log('DB connection error: ', err.message)
})