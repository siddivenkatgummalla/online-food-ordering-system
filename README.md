# Crave — Online Food Ordering System

A student-friendly full-stack project built with **Node.js, Express, SQLite, HTML, CSS and vanilla JavaScript**.

## Features

- Responsive food ordering home page
- Menu seeded with 12 sample dishes
- Category filters and menu search
- Add to cart, change quantities, remove items, live subtotal
- User registration and login with bcrypt password hashing
- Session-based authentication
- Checkout with customer name, phone number and delivery address
- Orders saved in SQLite; users can view their order history
- Server calculates prices from the database rather than trusting browser prices
- No payment gateway is connected; this is a demo/student project

## Requirements

- Node.js 18 or later
- npm

## Run locally

1. Extract the ZIP.
2. Open a terminal in the extracted `online_food_ordering_system` folder.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Start the app:

   ```bash
   npm start
   ```

5. Open **http://localhost:3000** in your browser.

The SQLite database file `food_ordering.db` is created automatically the first time the server runs.

## Test the app

1. Create an account using an email and a password of at least 6 characters.
2. Add menu items to your cart.
3. Open the cart and continue to checkout.
4. Enter delivery details and place the demo order.
5. Choose **My orders** to view saved orders.

## Project structure

```text
online_food_ordering_system/
├── package.json
├── server.js
├── README.md
└── public/
    ├── index.html
    ├── styles.css
    └── app.js
```

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/menu` | List available menu items |
| POST | `/api/register` | Create account |
| POST | `/api/login` | Log in |
| POST | `/api/logout` | Log out |
| GET | `/api/me` | Current session user |
| POST | `/api/orders` | Place an order (login required) |
| GET | `/api/orders` | View current user's orders (login required) |

## Important notes

- This is a local learning project, not production-ready software.
- Before deployment, set a strong `SESSION_SECRET`, use HTTPS, configure secure cookies, add CSRF/rate limiting and validation, and review SQLite/database deployment needs.
- Menu images load from Unsplash and therefore need an internet connection; the ordering backend itself runs locally.
