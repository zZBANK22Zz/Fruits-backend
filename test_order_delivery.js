
const axios = require('axios');

async function testOrderCreation() {
    const API_URL = 'http://localhost:8000/api'; // Adjust port if needed
    
    // 1. Login to get token
    console.log('Logging in...');
    // Replace with valid credentials
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
        email: 'test@example.com', 
        password: 'password123'
    }).catch(e => console.error('Login failed:', e.response?.data || e.message));

    if (!loginRes) return;
    const token = loginRes.data.data.token;
    console.log('Logged in. Token obtained.');

    // 2. Get User Addresses
    console.log('Fetching addresses...');
    const addressRes = await axios.get(`${API_URL}/addresses`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    
    const addresses = addressRes.data.data.addresses;
    if (addresses.length === 0) {
        console.error('No addresses found. Please create one manually or via UI first.');
        return;
    }
    const selectedAddress = addresses[0];
    console.log(`Selected Address ID: ${selectedAddress.id}, Coords: ${selectedAddress.latitude}, ${selectedAddress.longitude}`);

    // 3. Create Order
    console.log('Creating order...');
    const orderPayload = {
        items: [
            { fruit_id: 1, quantity: 2, weight: 2 } // Assuming fruit_id 1 exists. Adjust as needed.
        ],
        address_id: selectedAddress.id,
        shipping_address: "Test Address String",
        shipping_city: "Bangkok",
        shipping_postal_code: "10110",
        shipping_country: "Thailand",
        payment_method: "Thai QR PromptPay"
    };

    try {
        const orderRes = await axios.post(`${API_URL}/orders`, orderPayload, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Order Created Successfully!');
        console.log('Order ID:', orderRes.data.data.order.id);
        console.log('Total Amount:', orderRes.data.data.order.total_amount);
        console.log('Delivery Fee:', orderRes.data.data.order.delivery_fee);
        
        if (orderRes.data.data.order.delivery_fee > 0) {
            console.log('PASS: Delivery fee calculated.');
        } else {
            console.log('WARNING: Delivery fee is 0. Check distance calculation or business logic.');
        }

    } catch (e) {
        console.error('Order creation failed:', e.response?.data || e.message);
    }
}

testOrderCreation();
