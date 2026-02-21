const axios = require('axios');
require('dotenv').config();

const GOOGLE_MAP_API_KEY = process.env.GOOGLE_MAP_API;

const geocodeAddress = async (addressString) => {
  if (!GOOGLE_MAP_API_KEY) {
    throw new Error('Google Maps API Key is missing');
  }
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address: addressString,
        key: GOOGLE_MAP_API_KEY,
        language: 'th' 
      }
    });

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng
      };
    } else {
      console.error('Geocoding API error:', response.data.status, response.data.error_message);
      return null;
    }
  } catch (error) {
    console.error('Geocoding request failed:', error.message);
    return null;
  }
};

const calculateDistance = async (origin, destination) => {
  if (!GOOGLE_MAP_API_KEY) {
    throw new Error('Google Maps API Key is missing');
  }
  try {
    // origins/destinations can be "lat,lng" strings or address strings
    const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
      params: {
        origins: origin,
        destinations: destination,
        key: GOOGLE_MAP_API_KEY,
        mode: 'driving'
      }
    });

    if (response.data.status === 'OK') {
      const element = response.data.rows[0].elements[0];
      if (element.status === 'OK') {
        const distanceInMeters = element.distance.value;
        const distanceInKm = distanceInMeters / 1000;
        return distanceInKm;
      } else {
         console.error('Distance Matrix element error:', element.status);
         return null;
      }
    } else {
      console.error('Distance Matrix API error:', response.data.status, response.data.error_message);
      return null;
    }
  } catch (error) {
    if (error.response) {
        console.error('Distance Matrix request failed:', error.response.status, error.response.data);
    } else {
        console.error('Distance Matrix request failed:', error.message);
    }
    return null;
  }
};

module.exports = {
  geocodeAddress,
  calculateDistance
};
