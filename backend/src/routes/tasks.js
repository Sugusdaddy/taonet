const express = require('express');
const router = express.Router();
const { TaskController } = require('../controllers/taskController');

// Submit a new task
router.post('/submit', TaskController.submit);

// List tasks (must be before /:taskId)
router.get('/', TaskController.list);

// Get task by ID
router.get('/:taskId', TaskController.getTask);

// Get task result (waits for completion)
router.get('/:taskId/result', TaskController.getResult);

module.exports = router;
