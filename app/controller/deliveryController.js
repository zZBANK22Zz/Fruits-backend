const DeliveryService = require('../services/deliveryService');
const AddressModel = require('../model/addressModel');

class DeliveryController {
    // Calculate delivery fee preview
    static async calculateFee(req, res) {
        try {
            const { address_id, items } = req.body;

            if (!address_id) {
                return res.status(400).json({ success: false, message: 'Address ID is required' });
            }

            if (!items || !Array.isArray(items) || items.length === 0) {
                 return res.status(400).json({ success: false, message: 'Items are required' });
            }

            // 1. Fetch User Address
            const userAddress = await AddressModel.findById(address_id);
            if (!userAddress) {
                return res.status(404).json({ success: false, message: 'Address not found' });
            }

            // 2. Calculate Total Weight
            let totalWeight = 0;
            for (const item of items) {
                // If fruit has specific weight in DB, use it. Otherwise default to 1kg (or use quantity if sold by kg)
                // For now, assuming item.weight is passed or we default to item.quantity
                let weight = item.weight || 0;
                
                // If weight is not explicitly passed, try to estimate
                if (!weight) {
                     // Heuristic: if sold by kg (unit != piece), qty is weight.
                     // If sold by piece, assume 1kg/piece or fetch fruit weight from DB (omitted for speed unless needed)
                     // Using same logic as OrderController:
                     weight = item.quantity;
                }
                
                totalWeight += weight;
            }

            // 3. Calculate Fee
            const fee = await DeliveryService.calculateDeliveryFee(userAddress, totalWeight);

            return res.json({
                success: true,
                data: {
                    delivery_fee: fee,
                    total_weight: totalWeight,
                    distance: null // Service doesn't return distance yet, but could be added
                }
            });

        } catch (error) {
            console.error('Calculate fee error:', error);
            return res.status(500).json({ success: false, message: 'Failed to calculate delivery fee' });
        }
    }
}

module.exports = DeliveryController;
