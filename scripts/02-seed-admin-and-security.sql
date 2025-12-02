-- ============================================================
-- SECURITY SYSTEM - DEFAULT ADMIN + MANAGERS SEED
-- ============================================================

DO $$
DECLARE
  admin_role_id UUID;
  manager_role_id UUID;
  
  confidential_classification_id UUID;
  internal_classification_id UUID;

  admin_user_id UUID;
  manager1_id UUID;
  manager2_id UUID;
BEGIN
  -- Get role IDs
  SELECT id INTO admin_role_id FROM roles WHERE name = 'System Admin' LIMIT 1;
  SELECT id INTO manager_role_id FROM roles WHERE name = 'Manager' LIMIT 1;

  -- Get classification IDs
  SELECT id INTO confidential_classification_id FROM data_classifications WHERE name = 'Confidential' LIMIT 1;
  SELECT id INTO internal_classification_id FROM data_classifications WHERE name = 'Internal' LIMIT 1;

  -- --------------------------
  -- Create default Admin user
  INSERT INTO users (
    email, full_name, password_hash, department, email_verified, phone_verified, is_active, mfa_enabled
  ) VALUES (
    'admin@astu.edu.et',
    'System Administrator',
    '$2b$12$vR9jVXS6BrkojaLn5bBiVeB0wkw8e.SZLw1HgpotVHC3xWM831S..', -- Admin password hash
    'Administration',
    TRUE,
    FALSE,
    TRUE,
    FALSE
  ) ON CONFLICT (email) DO NOTHING;

  SELECT id INTO admin_user_id FROM users WHERE email = 'admin@astu.edu.et' LIMIT 1;

  -- Assign System Admin role
  IF admin_user_id IS NOT NULL AND admin_role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id)
    VALUES (admin_user_id, admin_role_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Assign Confidential clearance to Admin
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO user_clearance_levels (user_id, classification_id, assigned_by, reason)
    VALUES (
      admin_user_id,
      confidential_classification_id,
      admin_user_id,
      'System administrator with highest clearance'
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- --------------------------
  -- Create first Manager
  INSERT INTO users (
    email, full_name, password_hash, department, email_verified, phone_verified, is_active, mfa_enabled
  ) VALUES (
    'manager1@astu.edu.et',
    'Manager 1',
    '$2b$12$v1ojo2WnR5CrZKbI0rQQWeL1F9L7T6v2GSE.viF8vX57R2302kB3u', -- Manager1 password hash
    'Management',
    TRUE,
    FALSE,
    TRUE,
    FALSE
  ) ON CONFLICT (email) DO NOTHING;

  SELECT id INTO manager1_id FROM users WHERE email = 'manager1@astu.edu.et' LIMIT 1;

  -- Assign Manager role
  IF manager1_id IS NOT NULL AND manager_role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id)
    VALUES (manager1_id, manager_role_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Assign Internal clearance to Manager 1
  IF manager1_id IS NOT NULL THEN
    INSERT INTO user_clearance_levels (user_id, classification_id, assigned_by, reason)
    VALUES (
      manager1_id,
      internal_classification_id,
      admin_user_id,
      'Default manager clearance'
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- --------------------------
  -- Create second Manager
  INSERT INTO users (
    email, full_name, password_hash, department, email_verified, phone_verified, is_active, mfa_enabled
  ) VALUES (
    'manager2@astu.edu.et',
    'Manager 2',
    '$2b$12$Q6wSbwEbPDgx3XedMZSTYeMVu4FD9ql905Tbju4NSNgNa8bJGpNKi', -- Manager2 password hash
    'Management',
    TRUE,
    FALSE,
    TRUE,
    FALSE
  ) ON CONFLICT (email) DO NOTHING;

  SELECT id INTO manager2_id FROM users WHERE email = 'manager2@astu.edu.et' LIMIT 1;

  -- Assign Manager role
  IF manager2_id IS NOT NULL AND manager_role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id)
    VALUES (manager2_id, manager_role_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Assign Internal clearance to Manager 2
  IF manager2_id IS NOT NULL THEN
    INSERT INTO user_clearance_levels (user_id, classification_id, assigned_by, reason)
    VALUES (
      manager2_id,
      internal_classification_id,
      admin_user_id,
      'Default manager clearance'
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- --------------------------
  -- Log system events
  INSERT INTO system_events (event_type, severity, description, event_data) VALUES
    ('ADMIN_USER_CREATED','INFO','Default system administrator account created','{"email":"admin@astu.edu.et","role":"System Admin"}'),
    ('MANAGER_USER_CREATED','INFO','Default manager created','{"email":"manager1@astu.edu.et","role":"Manager"}'),
    ('MANAGER_USER_CREATED','INFO','Default manager created','{"email":"manager2@astu.edu.et","role":"Manager"}');
END $$;
