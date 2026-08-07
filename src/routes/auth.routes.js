const express = require('express');
const {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  updateProfile,
  forgotPassword,
  resetPassword
} = require('../controllers/auth.controller');
const { verifyJWT, optionalJWT } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resetToken', resetPassword);

// Logout (Allows optional JWT so logout clears cookies even if token is expired)
router.post('/logout', optionalJWT, logoutUser);

// Secured Routes
router.get('/me', verifyJWT, getCurrentUser);
router.put('/update-profile', verifyJWT, updateProfile);

module.exports = router;
