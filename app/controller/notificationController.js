const NotificationModel = require('../model/notificationModel');

class NotificationController {
    /**
     * Get all notifications for the current user
     */
    static async getNotifications(req, res) {
        try {
            const userId = req.user.id;
            const { limit, offset, is_read } = req.query;
            
            const options = {
                limit: limit ? parseInt(limit) : 50,
                offset: offset ? parseInt(offset) : 0,
                is_read: is_read === 'true' ? true : (is_read === 'false' ? false : null)
            };

            const notifications = await NotificationModel.getNotificationsByUserId(userId, options);
            const unreadCount = await NotificationModel.countUnread(userId);

            res.status(200).json({
                success: true,
                message: 'Notifications fetched successfully',
                data: {
                    notifications,
                    unread_count: unreadCount
                }
            });
        } catch (error) {
            console.error('Get notifications error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    /**
     * Mark a specific notification as read
     */
    static async markAsRead(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const notification = await NotificationModel.markAsRead(id, userId);

            if (!notification) {
                return res.status(404).json({
                    success: false,
                    message: 'Notification not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Notification marked as read',
                data: { notification }
            });
        } catch (error) {
            console.error('Mark as read error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    /**
     * Mark all notifications as read for current user
     */
    static async markAllAsRead(req, res) {
        try {
            const userId = req.user.id;
            const count = await NotificationModel.markAllAsRead(userId);

            res.status(200).json({
                success: true,
                message: `All notifications (${count}) marked as read`,
                data: { updated_count: count }
            });
        } catch (error) {
            console.error('Mark all as read error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    /**
     * Delete a notification
     */
    static async deleteNotification(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const deleted = await NotificationModel.deleteNotification(id, userId);

            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    message: 'Notification not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Notification deleted successfully'
            });
        } catch (error) {
            console.error('Delete notification error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
}

module.exports = NotificationController;
