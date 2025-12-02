-- 1) Create the "view_logs" permission (only if it doesn't exist yet)
INSERT INTO permissions (name, description, resource, action)
VALUES ('view_logs', 'Allow viewing audit and system logs', 'logs', 'view')
ON CONFLICT (name) DO NOTHING;

-- 2) Attach that permission to the System Admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'System Admin'
  AND p.name = 'view_logs'
ON CONFLICT DO NOTHING;