const express = require('express');
const { betController, cashoutController } = require('../controllers/playerController');
const router = express.Router();

router.post('/placeBet', betController);

router.post('/cashout', cashoutController);

router.post('/wallet/:player_id', (req, res) => {
    res.send('/wallet/:player_id send')
})

module.exports = router;