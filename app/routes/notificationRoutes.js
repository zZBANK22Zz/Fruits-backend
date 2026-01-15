const express = require('express');
const router = express.Router();
const NotificationController = require('../controller/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * @route GET /api/notifications
 * @desc Get all notifications for the current user
 * @access Private
 */
router.get('/', authMiddleware, NotificationController.getNotifications);

/**
 * @route PUT /api/notifications/mark-all-read
 * @desc Mark all notifications as read
 * @access Private
 */
router.put('/mark-all-read', authMiddleware, NotificationController.markAllAsRead);

/**
 * @route PUT /api/notifications/:id/read
 * @desc Mark a specific notification as read
 * @access Private
 */
router.put('/:id/read', authMiddleware, NotificationController.markAsRead);

/**
 * @route DELETE /api/notifications/:id
 * @desc Delete a notification
 * @access Private
 */
router.delete('/:id', authMiddleware, NotificationController.deleteNotification);

module.exports = router;
