-- ============================================================
-- DAC & ABAC SEED SCRIPT
-- Addis Ababa Science and Technology University
-- Department of Software Engineering
-- ============================================================

-- ============================
-- DAC ENFORCEMENT FUNCTION
-- ============================
CREATE OR REPLACE FUNCTION enforce_resource_owner()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.granted_by != (SELECT owner_id FROM resources WHERE id = NEW.resource_id)
       AND NOT EXISTS (
           SELECT 1 FROM user_roles ur
           JOIN roles r ON ur.role_id = r.id
           WHERE ur.user_id = NEW.granted_by AND r.name = 'System Admin'
       ) THEN
        RAISE EXCEPTION 'Only resource owner or System Admin can grant/revoke permissions';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_owner
BEFORE INSERT OR UPDATE ON resource_permissions
FOR EACH ROW
EXECUTE FUNCTION enforce_resource_owner();

-- ============================
-- DAC LOGGING FUNCTION
-- ============================
CREATE OR REPLACE FUNCTION log_dac_changes()
RETURNS TRIGGER AS $$
DECLARE
    target_user TEXT;
BEGIN
    target_user := COALESCE(
        (SELECT email FROM users WHERE id = NEW.granted_to_user_id),
        (SELECT name FROM roles WHERE id = NEW.granted_to_role_id)
    );

    INSERT INTO audit_logs(
        user_id,
        action_type,
        resource_type,
        resource_id,
        resource_name,
        description,
        created_at
    )
    VALUES (
        NEW.granted_by,
        TG_OP || '_RESOURCE_PERMISSION',
        'resource',
        NEW.resource_id,
        (SELECT name FROM resources WHERE id = NEW.resource_id),
        TG_OP || ' permission for ' || target_user,
        CURRENT_TIMESTAMP
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_dac
AFTER INSERT OR UPDATE OR DELETE ON resource_permissions
FOR EACH ROW
EXECUTE FUNCTION log_dac_changes();

-- ============================
-- SAMPLE RESOURCES
-- ============================
INSERT INTO resources (name, resource_type, description, department, classification_id, owner_id)
SELECT 'HR_Payroll_Report', 'document', 'Payroll report Q4', 'Human Resources',
       (SELECT id FROM data_classifications WHERE name='Confidential'),
       (SELECT id FROM users WHERE email='mk543gg@gmail.com')
ON CONFLICT DO NOTHING;

INSERT INTO resources (name, resource_type, description, department, classification_id, owner_id)
SELECT 'Project_SE_Report', 'document', 'Software Engineering Project Report', 'Software Engineering',
       (SELECT id FROM data_classifications WHERE name='Internal'),
       (SELECT id FROM users WHERE email='mkedu101@gmail.com')
ON CONFLICT DO NOTHING;

-- ============================
-- DAC PERMISSIONS EXAMPLES
-- ============================
-- Grant view access to Manager 1 for HR Report
INSERT INTO resource_permissions (resource_id, granted_to_user_id, can_view, granted_by, reason)
SELECT r.id, u.id, TRUE,
       r.owner_id,
       'Grant view access to manager'
FROM resources r
JOIN users u ON u.email='manager1@astu.edu.et'
WHERE r.name='HR_Payroll_Report'
ON CONFLICT DO NOTHING;

-- Grant role-based edit/view permission for Project SE Report
INSERT INTO resource_permissions (resource_id, granted_to_role_id, can_view, can_edit, granted_by, reason)
SELECT r.id, role.id, TRUE, TRUE,
       (SELECT id FROM users WHERE email='admin@astu.edu.et'),
       'Admin grants role-based edit permission'
FROM resources r
JOIN roles role ON role.name='Manager'
WHERE r.name='Project_SE_Report'
ON CONFLICT DO NOTHING;

-- ============================
-- ABAC ATTRIBUTE EXAMPLES
-- ============================
INSERT INTO abac_attributes (user_id, attribute_name, attribute_value)
SELECT id, 'department', 'Human Resources'
FROM users
WHERE email='mk543gg@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO abac_attributes (user_id, attribute_name, attribute_value)
SELECT id, 'role', 'Manager'
FROM users
WHERE email='manager1@astu.edu.et'
ON CONFLICT DO NOTHING;

INSERT INTO abac_attributes (user_id, attribute_name, attribute_value)
SELECT id, 'role', 'Employee'
FROM users
WHERE email='mkedu101@gmail.com'
ON CONFLICT DO NOTHING;

-- Example ABAC: location attribute
INSERT INTO abac_attributes (user_id, attribute_name, attribute_value)
SELECT id, 'location', 'Campus A'
FROM users
WHERE email='manager1@astu.edu.et'
ON CONFLICT DO NOTHING;

-- Example ABAC: employment status
INSERT INTO abac_attributes (user_id, attribute_name, attribute_value)
SELECT id, 'employment_status', 'active'
FROM users
WHERE email='mkedu101@gmail.com'
ON CONFLICT DO NOTHING;

-- ============================================================
-- DAC + ABAC SEED SCRIPT COMPLETE
-- ============================================================
