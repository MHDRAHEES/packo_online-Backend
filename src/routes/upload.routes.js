const express = require('express');
const upload = require('../middlewares/multer.middleware');
const {
  uploadSingleImage,
  uploadMultipleImages
} = require('../controllers/upload.controller');
const { verifyJWT, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post(
  '/single',
  verifyJWT,
  authorizeRoles('admin'),
  upload.single('image'),
  uploadSingleImage
);

router.post(
  '/multiple',
  verifyJWT,
  authorizeRoles('admin'),
  upload.array('images', 5),
  uploadMultipleImages
);

module.exports = router;
