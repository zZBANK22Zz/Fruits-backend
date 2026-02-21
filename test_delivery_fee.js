const DeliveryService = require('./app/services/deliveryService');
const dotenv = require('dotenv');

dotenv.config();

const userAddress = {
    latitude: 13.56392531,
    longitude: 100.32434821
};

const totalWeight = 1.0;

async function testCalculation() {
    try {
        console.log('Testing Delivery Fee Calculation...');
        console.log('User Address:', userAddress);
        console.log('SHOP_OWNER_ID:', process.env.SHOP_OWNER_ID);
        
        const fee = await DeliveryService.calculateDeliveryFee(userAddress, totalWeight);
        console.log('Calculated Fee:', fee);
    } catch (error) {
        console.error('Error calculating fee:', error);
    }
}

testCalculation();
