-- SQL Schema for Toko Jaya Sampurna Marketplace
-- Handles real-time Duitku payment gateway synchronization, transactions, products, and orders.
-- Author: Senior Fullstack & Payment Gateway Engineer

-- 1. Create Enums for Orders and Payment Transactions State
CREATE TYPE order_status AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED');
CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED');

-- 2. Create Users table (complements Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Products table
CREATE TABLE IF NOT EXISTS public.products (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    price BIGINT NOT NULL CHECK (price >= 0),
    condition VARCHAR(50) NOT NULL,
    location VARCHAR(100) NOT NULL,
    images TEXT[] DEFAULT '{}',
    is_verified BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    views INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    is_sold BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice VARCHAR(100) NOT NULL UNIQUE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    product_id VARCHAR(100) REFERENCES public.products(id) ON DELETE SET NULL,
    amount BIGINT NOT NULL CHECK (amount >= 0),
    status order_status DEFAULT 'PENDING'::order_status NOT NULL,
    delivery_type VARCHAR(50) DEFAULT 'delivery',
    shipping_address JSONB DEFAULT '{}'::jsonb,
    courier VARCHAR(100),
    shipping_cost BIGINT DEFAULT 0,
    payment_method VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create Payments table (Duitku Inquiry details)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    invoice VARCHAR(100) NOT NULL REFERENCES public.orders(invoice) ON DELETE CASCADE,
    reference VARCHAR(100), -- Duitku transaction reference
    amount BIGINT NOT NULL CHECK (amount >= 0),
    payment_method VARCHAR(50) NOT NULL,
    payment_url TEXT,
    qr_string TEXT,
    status payment_status DEFAULT 'PENDING'::payment_status NOT NULL,
    expiry_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create Transactions table (Historical ledger auditing)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    invoice VARCHAR(100) NOT NULL,
    payer_email VARCHAR(255) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    amount BIGINT NOT NULL,
    reference_id VARCHAR(100),
    status VARCHAR(50) NOT NULL,
    raw_gateway_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Optimized Database Indexes for high-performance lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_orders_invoice ON public.orders(invoice);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payments(reference);
CREATE INDEX IF NOT EXISTS idx_transactions_invoice ON public.transactions(invoice);

-- 8. Setup Auto-updates of updatedAt using Triggers
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_modtime BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_products_modtime BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_orders_modtime BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_payments_modtime BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 9. Enable Realtime Replication for critical payment-related tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;

COMMENT ON TABLE public.users IS 'Tabel Profil User Terintegrasi Supabase Auth';
COMMENT ON TABLE public.products IS 'Tabel Katalog Barang Toko Jaya Sampurna';
COMMENT ON TABLE public.orders IS 'Tabel Order Pembelian dari Buyer';
COMMENT ON TABLE public.payments IS 'Tabel Integrasi Gerbang Pembayaran Duitku';
COMMENT ON TABLE public.transactions IS 'Tabel Audit Log Ledger Transaksi Keuangan';
