const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const db = new Database(path.join(__dirname, 'food_ordering.db'));
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'replace-this-development-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, 'public')));

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL,
  image TEXT NOT NULL,
  available INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  items_json TEXT NOT NULL,
  total REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'Placed',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
`);

const count = db.prepare('SELECT COUNT(*) AS count FROM menu_items').get().count;
if (count === 0) {
  const seed = db.prepare(`INSERT INTO menu_items (name, description, category, price, image) VALUES (?, ?, ?, ?, ?)`);
  const items = [
    ['Classic Veg Burger','Crispy veggie patty, lettuce and house sauce.','Burgers',129,'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=800'],
    ['Cheese Burger','Juicy burger layered with melted cheese.','Burgers',169,'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800'],
    ['Margherita Pizza','Classic pizza with tomato, mozzarella and basil.','Pizza',249,'https://images.unsplash.com/photo-1579751626657-72bc17010498?w=800'],
    ['Farmhouse Pizza','Bell peppers, onion, tomato and mushrooms.','Pizza',329,'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800'],
    ['Paneer Tikka Wrap','Spiced paneer with crunchy vegetables.','Wraps',179,'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800'],
    ['Chicken Wrap','Grilled chicken, salad and creamy dressing.','Wraps',199,'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800'],
    ['Veg Biryani','Aromatic basmati rice with vegetables and spices.','Rice',189,'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800'],
    ['Chicken Biryani','Fragrant rice with seasoned chicken.','Rice',249,'https://images.unsplash.com/photo-1563379091339-03246963d96c?w=800'],
    ['Masala Dosa','Crispy dosa with potato masala and chutneys.','South Indian',99,'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800'],
    ['Idli Sambar','Soft idlis served with sambar and chutney.','South Indian',69,'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800'],
    ['French Fries','Golden, crispy salted fries.','Sides',89,'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800'],
    ['Chocolate Brownie','Rich chocolate brownie for dessert.','Desserts',99,'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800']
  ];
  const transaction = db.transaction(rows => rows.forEach(row => seed.run(...row)));
  transaction(items);
}

const requireAuth = (req, res, next) => {
  if (!req.session.user) return res.status(401).json({ error: 'Please log in first.' });
  next();
};

app.get('/api/menu', (req, res) => {
  const rows = db.prepare('SELECT id, name, description, category, price, image FROM menu_items WHERE available = 1 ORDER BY category, name').all();
  res.json(rows);
});

app.post('/api/register', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!name || !email || password.length < 6) {
    return res.status(400).json({ error: 'Enter your name, a valid email and a password of at least 6 characters.' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)').run(name, email, hash);
    req.session.user = { id: result.lastInsertRowid, name, email };
    res.status(201).json({ user: req.session.user });
  } catch (e) {
    res.status(409).json({ error: 'That email is already registered.' });
  }
});

app.post('/api/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }
  req.session.user = { id: user.id, name: user.name, email: user.email };
  res.json({ user: req.session.user });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', (req, res) => res.json({ user: req.session.user || null }));

app.post('/api/orders', requireAuth, (req, res) => {
  const { items, customerName, phone, address } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Your cart is empty.' });
  if (!customerName?.trim() || !phone?.trim() || !address?.trim()) {
    return res.status(400).json({ error: 'Please complete the delivery details.' });
  }

  const getItem = db.prepare('SELECT id, name, price FROM menu_items WHERE id = ? AND available = 1');
  const normalized = [];
  for (const line of items) {
    const item = getItem.get(Number(line.id));
    const quantity = Math.floor(Number(line.quantity));
    if (!item || !Number.isFinite(quantity) || quantity < 1 || quantity > 20) {
      return res.status(400).json({ error: 'One or more cart items are invalid.' });
    }
    normalized.push({ id: item.id, name: item.name, price: item.price, quantity });
  }
  const total = normalized.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const result = db.prepare(`INSERT INTO orders (user_id, customer_name, phone, address, items_json, total)
    VALUES (?, ?, ?, ?, ?, ?)`).run(
      req.session.user.id, customerName.trim(), phone.trim(), address.trim(), JSON.stringify(normalized), total
    );
  res.status(201).json({ id: result.lastInsertRowid, total, status: 'Placed' });
});

app.get('/api/orders', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT id, items_json, total, status, created_at FROM orders WHERE user_id = ? ORDER BY id DESC').all(req.session.user.id);
  res.json(rows.map(row => ({ ...row, items: JSON.parse(row.items_json) })));
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`Food ordering app running at http://localhost:${PORT}`));
