-- PostgreSQL Database Initialization

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'member',
    phone VARCHAR(20),
    avatar VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Gyms Table
CREATE TABLE IF NOT EXISTS gyms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    capacity INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Equipment Table
CREATE TABLE IF NOT EXISTS equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID REFERENCES gyms(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'available',
    last_maintenance TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Cameras Table
CREATE TABLE IF NOT EXISTS cameras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID REFERENCES gyms(id),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    stream_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_gyms_name ON gyms(name);
CREATE INDEX idx_equipment_gym ON equipment(gym_id);
CREATE INDEX idx_cameras_gym ON cameras(gym_id);
