const cron = require('node-cron');
const OrderModel = require('../model/orderModel');

class OrderCleanupService {
    /**
     * Clean up expired pending orders (orders not paid within 5 minutes)
     * This runs every minute to check for expired orders
     */
    static startCleanupJob() {
        // Run every minute: '* * * * *'
        cron.schedule('* * * * *', async () => {
            try {
                console.log('[Order Cleanup] Checking for expired pending orders...');
                
                // Get orders that are pending and older than 5 minutes
                const expiredOrders = await OrderModel.getExpiredPendingOrders(5);
                
                if (expiredOrders.length === 0) {
                    console.log('[Order Cleanup] No expired orders found');
                    return;
                }

                console.log(`[Order Cleanup] Found ${expiredOrders.length} expired order(s)`);
                
                // Get order IDs
                const orderIds = expiredOrders.map(order => order.id);
                
                // Batch update to cancelled status
                const updatedOrders = await OrderModel.batchUpdateOrdersToCancelled(orderIds);
                
                console.log(`[Order Cleanup] Successfully cancelled ${updatedOrders.length} expired order(s):`, 
                    updatedOrders.map(o => o.order_number).join(', '));
            } catch (error) {
                console.error('[Order Cleanup] Error cleaning up expired orders:', error);
            }
        });

        console.log('[Order Cleanup] Cleanup job started - checking every minute for orders older than 5 minutes');
    }

    /**
     * Manually trigger cleanup (useful for testing or manual execution)
     */
    static async cleanupExpiredOrders() {
        try {
            const expiredOrders = await OrderModel.getExpiredPendingOrders(5);
            
            if (expiredOrders.length === 0) {
                return { success: true, message: 'No expired orders found', count: 0 };
            }

            const orderIds = expiredOrders.map(order => order.id);
            const updatedOrders = await OrderModel.batchUpdateOrdersToCancelled(orderIds);
            
            return {
                success: true,
                message: `Successfully cancelled ${updatedOrders.length} expired order(s)`,
                count: updatedOrders.length,
                orders: updatedOrders
            };
        } catch (error) {
            console.error('[Order Cleanup] Error in manual cleanup:', error);
            throw error;
        }
    }
}

module.exports = OrderCleanupService;

