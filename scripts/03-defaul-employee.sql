-- ============================================================
-- TRIGGER FUNCTION TO ASSIGN PUBLIC CLEARANCE TO EMPLOYEES
-- ============================================================

CREATE OR REPLACE FUNCTION assign_public_clearance()
RETURNS TRIGGER AS $$
DECLARE
    employee_role_id UUID;
    public_classification_id UUID;
BEGIN
    -- Get the Employee role ID
    SELECT id INTO employee_role_id FROM roles WHERE name = 'Employee' LIMIT 1;

    -- Get the Public classification ID
    SELECT id INTO public_classification_id FROM data_classifications WHERE name = 'Public' LIMIT 1;

    -- Check if the new user has the Employee role
    IF employee_role_id IS NOT NULL AND public_classification_id IS NOT NULL THEN
        -- Insert the role assignment if it doesn't exist
        INSERT INTO user_roles (user_id, role_id)
        VALUES (NEW.id, employee_role_id)
        ON CONFLICT DO NOTHING;

        -- Assign Public clearance automatically
        INSERT INTO user_clearance_levels (user_id, classification_id, assigned_by, reason)
        VALUES (NEW.id, public_classification_id, NULL, 'Automatic public clearance for new employee')
        ON CONFLICT (user_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGER TO EXECUTE THE FUNCTION AFTER NEW USER INSERT
-- ============================================================
CREATE TRIGGER trg_assign_public_clearance
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION assign_public_clearance();
