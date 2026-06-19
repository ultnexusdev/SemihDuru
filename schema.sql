-- Supabase Schema for SemTattoo

-- 1. Services Table: Stores pricing based on size/time
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL, -- e.g., "Small Tattoo (3-5cm)"
  description TEXT,
  estimated_time_mins INTEGER,
  base_price_gbp DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Campaigns Table: For dynamic discounts
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL, -- e.g., "Bring a friend 20% off"
  discount_percentage INTEGER,
  discount_fixed_gbp DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Settings Table: For dynamic deposit rates
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value VARCHAR(255) NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default deposit setting (e.g. 50 GBP fixed deposit)
INSERT INTO settings (setting_key, setting_value, description) 
VALUES ('deposit_amount_gbp', '50', 'Fixed deposit amount in GBP required for bookings');

-- 4. Appointments Table
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255) NOT NULL,
  client_phone VARCHAR(20),
  appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  service_id UUID REFERENCES services(id),
  campaign_id UUID REFERENCES campaigns(id), -- Nullable
  reference_image_url TEXT,
  deposit_paid BOOLEAN DEFAULT false,
  deposit_amount DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'confirmed', 'completed', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Portfolio Table
CREATE TABLE portfolio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_url TEXT NOT NULL,
  title VARCHAR(255),
  description TEXT,
  size_cm VARCHAR(50),
  price_gbp DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
