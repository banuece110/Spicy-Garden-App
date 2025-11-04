const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { db, run } = require('./db');

function applySchema() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(sql);
}

function seedAdmin() {
  const username = 'admin';
  const password = 'admin123';
  const hash = bcrypt.hashSync(password, 10);
  try {
    run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash]);
    console.log('Admin user created: admin / admin123');
  } catch (e) {
    console.log('Admin user exists');
  }
}

function seedMenu() {
  const items = [
    { name: 'Idli', price_cents: 3000, image_url: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Idli_Sambar.jpg' },
    { name: 'Puttu', price_cents: 4000, image_url: 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Puttu_%28Kerala_Breakfast%29.jpg' },
    { name: 'Poori', price_cents: 4500, image_url: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Puri_Bhaji.jpg' },
    { name: 'Coffee', price_cents: 2000, image_url: 'https://upload.wikimedia.org/wikipedia/commons/4/45/A_small_cup_of_coffee.JPG' },
    { name: 'Dosa', price_cents: 5000, image_url: 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Dosa_dish.jpg' },
    { name: 'Pazhampoori', price_cents: 2500, image_url: 'https://upload.wikimedia.org/wikipedia/commons/9/91/Pazham_pori.jpg' },
    { name: 'Vada', price_cents: 3000, image_url: 'https://upload.wikimedia.org/wikipedia/commons/3/3b/Medu_Vada.jpg' },
  ];

  for (const it of items) {
    try {
      run('INSERT INTO menu_items (name, price_cents, image_url, is_available) VALUES (?, ?, ?, 1)', [it.name, it.price_cents, it.image_url]);
      console.log('Inserted menu item', it.name);
    } catch (e) {
      console.log('Menu item exists', it.name);
    }
  }
}

applySchema();
seedAdmin();
seedMenu();
console.log('Seeding complete');



