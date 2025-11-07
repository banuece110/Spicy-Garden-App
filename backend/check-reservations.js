const { all } = require('./db');

console.log('=== All Reservations ===\n');

try {
  const reservations = all('SELECT * FROM reservations ORDER BY created_at DESC');
  
  if (reservations.length === 0) {
    console.log('No reservations found.');
  } else {
    console.log(`Total reservations: ${reservations.length}\n`);
    reservations.forEach((res, index) => {
      console.log(`--- Reservation #${res.id} (${index + 1}/${reservations.length}) ---`);
      console.log(`Name: ${res.name}`);
      console.log(`Email: ${res.email}`);
      console.log(`Phone: ${res.phone}`);
      console.log(`Date: ${res.reservation_date}`);
      console.log(`Time: ${res.reservation_time}`);
      console.log(`Guests: ${res.guests}`);
      console.log(`Status: ${res.status}`);
      console.log(`Special Requests: ${res.special_requests || '(none)'}`);
      console.log(`Created At: ${res.created_at}`);
      console.log('');
    });
  }
} catch (error) {
  console.error('Error fetching reservations:', error);
}

