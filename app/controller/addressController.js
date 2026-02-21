const AddressModel = require('../model/addressModel');

class AddressController {
    // Create new address
    static async createAddress(req, res) {
        try {
            const userId = req.user.id;
            const { address_line, sub_district, district, province, postal_code, latitude, longitude } = req.body;

            // Validation
            if (!address_line || !sub_district || !district || !province || !postal_code) {
                return res.status(400).json({
                    success: false,
                    message: 'All address fields are required'
                });
            }

            const addressData = {
                user_id: userId,
                address_line,
                sub_district,
                district,
                province,
                postal_code,
                latitude: latitude || null,
                longitude: longitude || null
            };

            // If coordinates are missing, try to geocode
            if (!addressData.latitude || !addressData.longitude) {
                 // Construct full address string for geocoding
                const fullAddress = `${address_line}, ${sub_district}, ${district}, ${province}, ${postal_code}, Thailand`;
                
                // Get coordinates using Google Maps Service
                const googleMapsService = require('../services/googleMapsService');
                
                try {
                    const coordinates = await googleMapsService.geocodeAddress(fullAddress);
                    if (coordinates) {
                        addressData.latitude = coordinates.lat;
                        addressData.longitude = coordinates.lng;
                    }
                } catch (geoError) {
                    console.error('Geocoding failed during create address:', geoError);
                    // Create address anyway without coordinates
                }
            }

            const newAddress = await AddressModel.create(addressData);

            res.status(201).json({
                success: true,
                message: 'Address added successfully',
                data: { address: newAddress }
            });
        } catch (error) {
            console.error('Create address error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // Get user's addresses
    static async getMyAddresses(req, res) {
        try {
            const userId = req.user.id;
            const addresses = await AddressModel.findByUserId(userId);

            res.status(200).json({
                success: true,
                message: 'Addresses fetched successfully',
                data: { addresses }
            });
        } catch (error) {
            console.error('Get my addresses error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // Update address
    static async updateAddress(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const { address_line, sub_district, district, province, postal_code, latitude, longitude } = req.body;

            // Check if address exists and belongs to user
            const address = await AddressModel.findById(id);
            if (!address) {
                return res.status(404).json({
                    success: false,
                    message: 'Address not found'
                });
            }

            if (address.user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You can only update your own addresses'
                });
            }

            // Validation
            if (!address_line || !sub_district || !district || !province || !postal_code) {
                return res.status(400).json({
                    success: false,
                    message: 'All address fields are required'
                });
            }

            let finalLatitude = latitude || null;
            let finalLongitude = longitude || null;

            // If coordinates are missing in request, try to geocode
            if (!finalLatitude || !finalLongitude) {
                 // Construct full address string for geocoding
                const fullAddress = `${address_line}, ${sub_district}, ${district}, ${province}, ${postal_code}, Thailand`;
                
                // Get coordinates using Google Maps Service
                const googleMapsService = require('../services/googleMapsService');
                
                try {
                    const coordinates = await googleMapsService.geocodeAddress(fullAddress);
                    if (coordinates) {
                        finalLatitude = coordinates.lat;
                        finalLongitude = coordinates.lng;
                    }
                } catch (geoError) {
                    console.error('Geocoding failed during create/update address:', geoError);
                     // Keep existing coordinates if geocoding fails? Or null?
                     // For now, let's keep it null if explicitly updating. 
                     // Or maybe we should keep previous coordinates if not provided?
                     // The logic here is: if user explicitly sends null, we might want to clear it?
                     // But usually update sends all fields.
                }
            }

            const updatedAddress = await AddressModel.update(id, {
                address_line,
                sub_district,
                district,
                province,
                postal_code,
                latitude: finalLatitude,
                longitude: finalLongitude
            });

            res.status(200).json({
                success: true,
                message: 'Address updated successfully',
                data: { address: updatedAddress }
            });
        } catch (error) {
            console.error('Update address error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // Delete address
    static async deleteAddress(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            // Check if address exists and belongs to user
            const address = await AddressModel.findById(id);
            if (!address) {
                return res.status(404).json({
                    success: false,
                    message: 'Address not found'
                });
            }

            if (address.user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You can only delete your own addresses'
                });
            }

            await AddressModel.delete(id);

            res.status(200).json({
                success: true,
                message: 'Address deleted successfully'
            });
        } catch (error) {
            console.error('Delete address error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
}

module.exports = AddressController;
