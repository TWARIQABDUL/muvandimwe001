-- Point-of-sale items sold alongside services (water/"amazi", gang, etc.)
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    gym_id TEXT NOT NULL,
    name TEXT NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gym_id) REFERENCES gyms(id),
    UNIQUE (gym_id, name)
);

CREATE TABLE IF NOT EXISTS product_sales (
    id TEXT PRIMARY KEY,
    gym_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    user_id TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT 'Cash',
    sold_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gym_id) REFERENCES gyms(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_products_gym ON products(gym_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_gym_date ON product_sales(gym_id, sold_at);
