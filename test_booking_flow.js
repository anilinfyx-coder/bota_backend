/**
 * End-to-end API test for booking flow:
 * 1. Get a real business_id from DB
 * 2. Test checkAvailability 
 * 3. Test createBooking (guest — no customer_id)
 * 4. Verify booking appears in getBusinessBookings
 */

const pool = require('./db');

async function test() {
  console.log('\n====  BOOKING API SMOKE TEST  ====\n');

  // Step 1: Get first business with tables
  const bizRes = await pool.query(`
    SELECT b.id, b.name, b.grace_time_minutes, b.online_allocation_percentage
    FROM businesses b
    INNER JOIN tables t ON t.business_id = b.id AND t.is_active = true
    GROUP BY b.id
    LIMIT 1
  `);

  if (bizRes.rows.length === 0) {
    console.error('❌ No businesses with active tables found. Run migratePhase8_tables.js first.');
    await pool.end();
    return;
  }

  const biz = bizRes.rows[0];
  console.log(`✅ Testing with business: "${biz.name}" (${biz.id})`);
  console.log(`   Grace time: ${biz.grace_time_minutes} min | Online allocation: ${biz.online_allocation_percentage}%`);

  // Step 2: Build a test datetime — 2 hours from now
  const testDt = new Date(Date.now() + 2 * 60 * 60 * 1000);
  // Round to next half-hour
  testDt.setMinutes(testDt.getMinutes() >= 30 ? 30 : 0, 0, 0);
  const testDtISO = testDt.toISOString();
  console.log(`\n── Step 2: Check availability for ${testDtISO} (2 guests) ──`);

  const http = require('http');
  const get = (url) => new Promise((resolve, reject) => {
    http.get(url, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve(d); } });
    }).on('error', reject);
  });

  const post = (url, body) => new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'localhost', port: 5000,
      path: url, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };
    const req = http.request(opts, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => { try { resolve({ status: r.statusCode, body: JSON.parse(d) }); } catch(e) { resolve({ status: r.statusCode, body: d }); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });

  // Availability check
  const availUrl = `http://localhost:5000/api/bookings/availability?business_id=${biz.id}&date=${encodeURIComponent(testDtISO)}&guests=2`;
  const avail = await get(availUrl);
  console.log('   Response:', JSON.stringify(avail));

  if (!avail.available) {
    console.log('⚠️  Not available at this slot (may be operating hours). Continuing anyway to test createBooking error handling...');
  } else {
    console.log('✅ Slot is available!');
  }

  // Step 3: Create a guest booking
  console.log(`\n── Step 3: Create guest booking ──`);
  const bookRes = await post('/api/bookings', {
    business_id: biz.id,
    customer_name: 'Test Guest',
    customer_phone: '9999999999',
    booking_time: testDtISO,
    booking_source: 'ONLINE',
    guests: 2,
  });
  console.log(`   Status: ${bookRes.status}`);
  console.log('   Response:', JSON.stringify(bookRes.body));

  if (bookRes.status === 201) {
    const bookingId = bookRes.body.booking_id;
    console.log(`✅ Booking created: ${bookingId}`);

    // Step 4: Verify booking appears in getBusinessBookings
    console.log(`\n── Step 4: Verify booking in getBusinessBookings ──`);
    const listRes = await get(`http://localhost:5000/api/bookings/${biz.id}`);
    const found = listRes.data?.find(b => b.id === bookingId);
    if (found) {
      console.log('✅ Found booking in list:');
      console.log(`   customer_name: ${found.customer_name}`);
      console.log(`   customer_phone: ${found.customer_phone}`);
      console.log(`   guests: ${found.guests}`);
      console.log(`   table_number: ${found.table_number}`);
      console.log(`   status: ${found.status}`);
    } else {
      console.log('❌ Booking NOT found in list — check getBusinessBookings query');
      console.log('   Raw response (first 2):', JSON.stringify(listRes.data?.slice(0, 2)));
    }

    // Clean up test booking
    await pool.query("UPDATE bookings SET status = 'CANCELLED' WHERE id = $1", [bookingId]);
    console.log(`\n🧹 Test booking cancelled (cleaned up).`);
  } else {
    console.log('❌ Booking creation failed — check controller logs above');
  }

  console.log('\n====  TEST COMPLETE  ====\n');
  await pool.end();
}

test().catch(e => {
  console.error('FATAL:', e.message);
  pool.end();
});
