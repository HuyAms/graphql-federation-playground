const {locations} = require('./locations_data.json');

class LocationsAPI {
  getAllLocations() {
    return locations;
  }

  getLocation(id) {
    return locations.find(l => l.id === id);
  }

  getWeather(id) {
    console.log(`[LocationsAPI] getWeather for ${id}`);
    return '30 - Sunny';
  }
}

module.exports = LocationsAPI;
