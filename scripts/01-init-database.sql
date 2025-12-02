-- ============================================================
-- SECURITY SYSTEM DATABASE INITIALIZATION (CLEAN VERSION)
-- Addis Ababa Science and Technology University
-- Department of Software Engineering
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  department VARCHAR(100),
  employee_id VARCHAR(50) UNIQUE,

  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  failed_login_attempts INT DEFAULT 0,
  account_locked_until TIMESTAMP,
  last_login TIMESTAMP,

  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_method VARCHAR(50),
  mfa_secret VARCHAR(255),

  profile_picture_url VARCHAR(500),
  date_of_birth DATE,
  address TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_password_change TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ROLES
-- ============================================================
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- USER ROLES
-- ============================================================
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by UUID REFERENCES users(id),
  UNIQUE(user_id, role_id)
);

-- ============================================================
-- PERMISSIONS (EMPTY – NO DEFAULT INSERT)
-- ============================================================
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ROLE PERMISSIONS (EMPTY)
-- ============================================================
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE(role_id, permission_id)
);

-- ============================================================
-- DATA CLASSIFICATIONS
-- ============================================================
CREATE TABLE data_classifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
  level INT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- USER CLEARANCE LEVELS
-- ============================================================
CREATE TABLE user_clearance_levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  classification_id UUID NOT NULL REFERENCES data_classifications(id),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by UUID REFERENCES users(id),
  reason TEXT
);

-- ============================================================
-- RESOURCES
-- ============================================================
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  description TEXT,
  department VARCHAR(100),

  classification_id UUID NOT NULL REFERENCES data_classifications(id),
  owner_id UUID NOT NULL REFERENCES users(id),

  file_path VARCHAR(500),
  file_size INT,
  file_hash VARCHAR(255),

  is_encrypted BOOLEAN DEFAULT TRUE,
  encryption_key_id VARCHAR(100),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  retention_until DATE,

  is_active BOOLEAN DEFAULT TRUE,
  is_archived BOOLEAN DEFAULT FALSE
);

-- ============================================================
-- RESOURCE PERMISSIONS (DAC)
-- ============================================================
CREATE TABLE resource_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  granted_to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  granted_to_role_id UUID REFERENCES roles(id) ON DELETE CASCADE,

  can_view BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  can_share BOOLEAN DEFAULT FALSE,

  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  granted_by UUID NOT NULL REFERENCES users(id),

  reason TEXT,

  CONSTRAINT either_user_or_role CHECK (
    (granted_to_user_id IS NOT NULL AND granted_to_role_id IS NULL) OR
    (granted_to_user_id IS NULL AND granted_to_role_id IS NOT NULL)
  )
);

-- ============================================================
-- ACCESS RULES
-- ============================================================
CREATE TABLE access_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,

  condition_type VARCHAR(50),
  condition_value TEXT,

  is_deny_rule BOOLEAN DEFAULT FALSE,
  priority INT DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ABAC
-- ============================================================
CREATE TABLE abac_attributes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attribute_name VARCHAR(100) NOT NULL,
  attribute_value VARCHAR(255) NOT NULL,
  UNIQUE(user_id, attribute_name)
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action_type VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  resource_name VARCHAR(255),

  description TEXT,
  old_value TEXT,
  new_value TEXT,

  ip_address VARCHAR(45),
  user_agent TEXT,
  status VARCHAR(50),

  is_encrypted BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- SYSTEM EVENTS
-- ============================================================
CREATE TABLE system_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20),
  description TEXT,
  event_data TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ROLE CHANGE REQUESTS
-- ============================================================
CREATE TABLE role_change_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requested_by UUID NOT NULL REFERENCES users(id),
  requested_for UUID NOT NULL REFERENCES users(id),
  from_role_id UUID REFERENCES roles(id),
  to_role_id UUID NOT NULL REFERENCES roles(id),

  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id),
  review_notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP
);

-- ============================================================
-- SESSIONS
-- ============================================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(500) UNIQUE NOT NULL,

  ip_address VARCHAR(45),
  user_agent TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  is_valid BOOLEAN DEFAULT TRUE
);

-- ============================================================
-- OTP TOKENS
-- ============================================================
CREATE TABLE otp_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,

  otp_type VARCHAR(50),
  used BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);

-- ============================================================
-- PASSWORD HISTORY
-- ============================================================
CREATE TABLE password_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- BACKUP RECORDS
-- ============================================================
CREATE TABLE backup_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  backup_name VARCHAR(255) NOT NULL,
  backup_type VARCHAR(50),
  data_backed_up TEXT,

  backup_size_bytes BIGINT,
  checksum VARCHAR(255),

  is_encrypted BOOLEAN DEFAULT TRUE,
  encryption_algorithm VARCHAR(100),

  backup_location VARCHAR(500),
  status VARCHAR(50),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_verified TIMESTAMP
);

-- ============================================================
-- DEFAULT DATA CLASSIFICATIONS (ONLY POPULATED TABLE)
-- ============================================================
INSERT INTO data_classifications (name, level, description) VALUES
  ('Public', 0, 'No restrictions'),
  ('Internal', 1, 'Internal use'),
  ('Confidential', 2, 'Highly restricted')
ON CONFLICT DO NOTHING;

-- ============================================================
-- DEFAULT ROLES (ONLY POPULATED TABLE)
-- ============================================================
INSERT INTO roles (name, description, is_system_role) VALUES
  ('System Admin', 'Full access', TRUE),
  ('Manager', 'Mid-level internal access', TRUE),
  ('Employee', 'Standard user role', FALSE)
ON CONFLICT DO NOTHING;
