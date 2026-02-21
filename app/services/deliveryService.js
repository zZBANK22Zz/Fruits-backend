const GoogleMapsService = require('./googleMapsService');

// Shop location (Bangkok default coordinates - Fallback)
const DEFAULT_SHOP_LOCATION = {
    latitude: 13.7563,
    longitude: 100.5018
};

// Delivery Fee Constants
const BASE_FEE_SMALL = 35; // 0-1 kg
const BASE_FEE_HEAVY = 210; // > 1 kg
const DISTANCE_RATE = 2; // THB per km (example rate)

const AddressModel = require('../model/addressModel'); // Import AddressModel

class DeliveryService {
    static async calculateDeliveryFee(userAddress, totalWeight) {
        try {
            if (!userAddress.latitude || !userAddress.longitude) {
                // If coordinates are missing, try to geocode or return error
                throw new Error('Address coordinates are missing for delivery calculation');
            }

            // Determine Shop Location (Dynamic or Fallback)
            let shopOrigin = DEFAULT_SHOP_LOCATION;
            const shopOwnerId = process.env.SHOP_OWNER_ID;

            if (shopOwnerId) {
                const shopAddress = await AddressModel.findShopAddress(shopOwnerId);
                if (shopAddress && shopAddress.latitude && shopAddress.longitude) {
                    shopOrigin = {
                        latitude: shopAddress.latitude,
                        longitude: shopAddress.longitude
                    };
                }
            }

            const origin = `${shopOrigin.latitude},${shopOrigin.longitude}`;
            const destination = `${userAddress.latitude},${userAddress.longitude}`;

            const distanceKm = await GoogleMapsService.calculateDistance(origin, destination);

            if (distanceKm === null) {
                throw new Error('Could not calculate distance');
            }

            let deliveryFee = 0;

            // Fee Logic: Base + Per Km
            if (totalWeight <= 1.0) {
                deliveryFee = BASE_FEE_SMALL + (distanceKm * DISTANCE_RATE);
            } else {
                deliveryFee = BASE_FEE_HEAVY + (distanceKm * DISTANCE_RATE);
            }

            return Math.ceil(deliveryFee); 

        } catch (error) {
            console.error('Delivery fee calculation error:', error);
            throw error; 
        }
    }
}
module.exports = DeliveryService;
