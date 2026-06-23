
const pool = require('./db');

// Different restaurant profiles - variety of operating hours + meals
const profiles = [
  {
    // Full day operation (Breakfast + Lunch + Dinner)
    daily: { open: '08:00', close: '23:30', closed: false },
    sunday: { open: '09:00', close: '23:00', closed: false },
    meals: {
      breakfast: { open: '08:00', close: '11:00', active: true },
      lunch: { open: '11:30', close: '15:30', active: true },
      dinner: { open: '18:00', close: '23:00', active: true }
    }
  },
  {
    // Lunch + Dinner only (no breakfast)
    daily: { open: '11:00', close: '23:00', closed: false },
    sunday: { open: '11:00', close: '22:00', closed: false },
    meals: {
      breakfast: { open: '07:00', close: '10:30', active: false },
      lunch: { open: '11:00', close: '15:00', active: true },
      dinner: { open: '17:30', close: '23:00', active: true }
    }
  },
  {
    // All-day with late dinner (club/bar style)
    daily: { open: '10:00', close: '01:00', closed: false },
    sunday: { open: '11:00', close: '23:30', closed: false },
    meals: {
      breakfast: { open: '10:00', close: '12:00', active: true },
      lunch: { open: '12:30', close: '16:00', active: true },
      dinner: { open: '19:00', close: '01:00', active: true }
    }
  },
  {
    // Cafe style - Morning + Lunch only
    daily: { open: '07:30', close: '21:00', closed: false },
    sunday: { open: '08:00', close: '20:00', closed: false },
    meals: {
      breakfast: { open: '07:30', close: '11:30', active: true },
      lunch: { open: '12:00', close: '16:30', active: true },
      dinner: { open: '17:00', close: '21:00', active: true }
    }
  }
];

async function main() {
  try {
    const r = await pool.query('SELECT id, name FROM businesses ORDER BY name');
    const businesses = r.rows;
    console.log(`Updating ${businesses.length} businesses with operating hours + meals config...`);

    for (let i = 0; i < businesses.length; i++) {
      const biz = businesses[i];
      const profile = profiles[i % profiles.length];

      const operatingHours = {
        monday: { ...profile.daily },
        tuesday: { ...profile.daily },
        wednesday: { ...profile.daily },
        thursday: { ...profile.daily },
        friday: { ...profile.daily },
        saturday: { ...profile.daily },
        sunday: { ...profile.sunday },
        meals: { ...profile.meals }
      };

      await pool.query(
        'UPDATE businesses SET operating_hours = $1 WHERE id = $2',
        [JSON.stringify(operatingHours), biz.id]
      );
      console.log(`  ✓ Updated: ${biz.name} (${biz.id}) — profile ${(i % profiles.length) + 1}`);
    }

    console.log('\nAll done! Verifying first record...');
    const verify = await pool.query('SELECT name, operating_hours FROM businesses LIMIT 1');
    console.log(JSON.stringify(verify.rows[0].operating_hours, null, 2));

    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

main();
