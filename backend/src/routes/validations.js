const express = require('express');
const router = express.Router();
const { ValidationController } = require('../controllers/validationController');

// Submit validation
router.post('/submit', ValidationController.submitValidation);

// Get validations for a task
router.get('/task/:taskId', ValidationController.getTaskValidations);

// Get validator stats
router.get('/validator/:address', ValidationController.getValidatorStats);

module.exports = router;
