const express = require('express');
const router = express.Router();
const {
  createReservation,
  cancelUserReservation,
  getReservations
} = require('../controllers/reservationController');
const { verifyToken } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validate');

router.post('/', verifyToken, createReservation);
router.get('/', verifyToken, getReservations);
router.patch('/:id/cancel', verifyToken, validateObjectId('id'), cancelUserReservation);

module.exports = router;
