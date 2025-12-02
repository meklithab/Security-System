-- ============================================================
-- PUBLIC RESOURCES SEED
-- ============================================================

-- Sample public resource 1
INSERT INTO resources (name, resource_type, description, department, classification_id, owner_id)
SELECT 'Employee_Handbook', 'document', 'General employee handbook', 'Human Resources',
       (SELECT id FROM data_classifications WHERE name='Public'),
       (SELECT id FROM users WHERE email='admin@astu.edu.et')
ON CONFLICT DO NOTHING;

-- Sample public resource 2
INSERT INTO resources (name, resource_type, description, department, classification_id, owner_id)
SELECT 'IT_Policies', 'document', 'IT department policies and guidelines', 'IT Department',
       (SELECT id FROM data_classifications WHERE name='Public'),
       (SELECT id FROM users WHERE email='admin@astu.edu.et')
ON CONFLICT DO NOTHING;

-- Sample public resource 3
INSERT INTO resources (name, resource_type, description, department, classification_id, owner_id)
SELECT 'Campus_Map', 'document', 'Map of ASTU Campus', 'Administration',
       (SELECT id FROM data_classifications WHERE name='Public'),
       (SELECT id FROM users WHERE email='admin@astu.edu.et')
ON CONFLICT DO NOTHING;

-- Grant view permissions for public resources to all Employees automatically
INSERT INTO resource_permissions (resource_id, granted_to_role_id, can_view, granted_by, reason)
SELECT r.id,
       (SELECT id FROM roles WHERE name='Employee'),
       TRUE,
       (SELECT id FROM users WHERE email='admin@astu.edu.et'),
       'Automatic view permission for public resources'
FROM resources r
WHERE r.classification_id = (SELECT id FROM data_classifications WHERE name='Public')
ON CONFLICT DO NOTHING;

-- ============================================================
-- PUBLIC RESOURCE SEED COMPLETE
-- ============================================================
