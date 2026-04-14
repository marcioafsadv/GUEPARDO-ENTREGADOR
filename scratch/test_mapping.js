
// Mock of the mapping logic from App.tsx
const mapDbDeliveryToMission = (d) => {
  return {
    id: d.id,
    storeName: d.store_name || 'Loja',
    storeAddress: d.store_address || '',
    customerName: d.customer_name || 'Cliente',
    customerAddress: d.customer_address || '',
    items: d.items || [],
    destinationLat: d.destination_lat || d.items?.destinationLat,
    destinationLng: d.destination_lng || d.items?.destinationLng,
    storeLat: d.stores?.lat,
    storeLng: d.stores?.lng,
    stopNumber: d.stop_number || d.items?.stopNumber || 1,
  };
};

// Test Case 1: Lojista coordinates in 'items'
const sampleRow = {
  id: '123',
  store_name: 'Guepardo Lojista',
  store_address: 'Rua A, 100',
  customer_address: 'Rua B, 200',
  items: {
    destinationLat: -23.1234,
    destinationLng: -47.5678,
    stopNumber: 2
  },
  stores: {
    lat: -23.0000,
    lng: -47.0000
  }
};

const mission = mapDbDeliveryToMission(sampleRow);

console.log('--- TEST RESULTS ---');
console.log('Destination Lat:', mission.destinationLat); // Expected: -23.1234
console.log('Destination Lng:', mission.destinationLng); // Expected: -47.5678
console.log('Store Lat:', mission.storeLat); // Expected: -23.0000
console.log('Store Lng:', mission.storeLng); // Expected: -47.0000
console.log('Stop Number:', mission.stopNumber); // Expected: 2

if (mission.destinationLat === -23.1234 && mission.storeLat === -23.0000) {
    console.log('\n✅ PASS: Coordinates mapped correctly from items and joined stores.');
} else {
    console.log('\n❌ FAIL: Coordinate mapping failed.');
    process.exit(1);
}
