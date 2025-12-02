# Security System - Setup & Installation Guide

**Addis Ababa Science and Technology University**  
**Department of Software Engineering**

## Project Overview

This is a comprehensive full-stack security system implementing:
- **Authentication & Authorization**: Password-based auth with MFA/OTP support
- **Access Control**: MAC, DAC, RBAC, RuBAC, and ABAC implementations
- **Audit Trails**: Comprehensive logging with encryption and compliance reporting
- **Data Protection**: Encrypted backups with integrity verification
- **Admin Dashboard**: Complete access management interface
- **User Dashboard**: Profile management and activity monitoring

## Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account with database configured
- PostgreSQL 13+ (via Supabase)
- Git

## Environment Variables

The following environment variables are automatically set by the Supabase integration:

\`\`\`
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_JWT_SECRET
POSTGRES_URL
POSTGRES_PRISMA_URL
POSTGRES_URL_NON_POOLING
POSTGRES_USER
POSTGRES_PASSWORD
POSTGRES_DATABASE
POSTGRES_HOST
\`\`\`

## Installation Steps

### 1. Initialize Database

Run the SQL migration script to create all tables:

\`\`\`bash
# The database migration is in scripts/01-init-database.sql
# This creates all necessary tables for the security system
\`\`\`

**Tables Created:**
- `users` - User accounts with authentication
- `roles` - Role definitions for RBAC
- `user_roles` - User-role assignments
- `permissions` - System permissions
- `role_permissions` - Role-permission mappings
- `data_classifications` - MAC data levels (Public, Internal, Confidential, Secret)
- `user_clearance_levels` - User MAC clearance
- `resources` - Documents/files/records
- `resource_permissions` - DAC permissions
- `access_rules` - RuBAC time/location rules
- `abac_attributes` - Custom ABAC attributes
- `audit_logs` - Encrypted activity logs
- `system_events` - System event logging
- `sessions` - User session management
- `otp_tokens` - One-time passwords
- `password_history` - Password change history
- `backup_records` - Backup metadata
- `role_change_requests` - Dynamic role requests

### 2. Install Dependencies

\`\`\`bash
npm install
# or
yarn install
\`\`\`

### 3. Start Development Server

\`\`\`bash
npm run dev
# or
yarn dev
\`\`\`

The application will be available at `http://localhost:3000`

## Usage

### Login

Visit the login page at `/`:
- **Demo Admin**: admin@astu.edu.et / SecurePass123!
- **Demo User**: employee@astu.edu.et / SecurePass123!

### Admin Dashboard

Access at `/admin` (requires System Admin role):
- **Overview**: System status and alerts
- **Users**: User management and role assignment
- **Roles**: Role configuration and permissions
- **Access Control**: Policy, clearance, and permission management
- **Audit Logs**: Activity logging, filtering, and export
- **Backups**: Backup creation, restoration, and retention

### User Dashboard

Access at `/dashboard` (all authenticated users):
- **Profile**: Update personal information
- **Security**: Password management and MFA setup
- **Activity**: View personal activity history

## Security Features

### 1. Authentication
- Strong password requirements (12+ chars, uppercase, lowercase, numbers, special)
- Bcrypt password hashing with salt (rounds: 12)
- Account lockout after 5 failed attempts (30-minute lockout)
- Multi-factor authentication (Email OTP)
- Session management with expiration

### 2. Access Control

**Mandatory Access Control (MAC)**
- Data classification levels: Public (0), Internal (1), Confidential (2), Secret (3)
- User clearance assignment by administrators
- Automatic enforcement on resource access

**Discretionary Access Control (DAC)**
- Resource owner controls who can access their resources
- Fine-grained permissions: view, edit, delete, share
- Permission audit trails

**Role-Based Access Control (RBAC)**
- 7 predefined system roles
- Custom role creation
- Role change approval workflow
- Permission management per role

**Rule-Based Access Control (RuBAC)**
- Time-based access rules (working hours enforcement)
- Location-based rules (campus network only)
- Conditional approval rules
- Dynamic rule evaluation

**Attribute-Based Access Control (ABAC)**
- Fine-grained control using user attributes
- Department-based access restrictions
- Combined attribute policies
- Real-time policy decision points

### 3. Audit & Logging
- Encrypted activity logs (base64 encoding)
- Centralized logging across all operations
- System event logging with severity levels
- Anomaly detection for suspicious patterns
- Compliance report generation
- Log export (CSV/JSON)

### 4. Data Protection
- Encrypted backup creation (AES-256)
- Automated daily backups with 90-day retention
- Backup integrity verification (SHA-256 checksum)
- Granular backup recovery
- Data masking for sensitive information

### 5. Additional Security
- HTTPS/TLS for data transmission
- Row-level security policies (configured in Supabase)
- Cross-site scripting (XSS) protection
- SQL injection prevention via parameterized queries

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-otp` - Verify OTP for MFA

### Audit & Logs
- `GET /api/audit/logs` - Retrieve audit logs
- `GET /api/system-events` - Get system events

### Backup & Recovery
- `POST /api/backup/create` - Create backup
- `GET /api/backup/history` - Get backup history

## Database Backup & Recovery

### Create Manual Backup
\`\`\`typescript
import { createBackup } from '@/lib/backup-service'

const backup = await createBackup({
  frequency: 'manual',
  retentionDays: 90,
  encryptionEnabled: true,
  tables: ['users', 'roles', 'resources', 'audit_logs']
})
\`\`\`

### Automated Backups
\`\`\`typescript
import { scheduleAutomaticBackups } from '@/lib/backup-service'

await scheduleAutomaticBackups({
  frequency: 'daily',
  retentionDays: 90,
  encryptionEnabled: true,
  tables: ['users', 'roles', 'resources', 'audit_logs']
})
\`\`\`

## Compliance Features

### Password Policy Enforcement
- Minimum 12 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

### Account Security
- Account lockout after 5 failed login attempts
- 30-minute lockout period
- Failed attempt logging
- Last login tracking

### Multi-Factor Authentication
- Email-based OTP (6-digit, 10-minute expiry)
- Session token management
- Per-user MFA settings

### Audit Trail Compliance
- All user actions logged
- Timestamp and IP address tracking
- User agent logging
- Action status recording (success/denied/error)
- Encrypted sensitive data

## Monitoring & Alerts

### Alert Types
- **Info**: Normal operations (backups, configuration changes)
- **Warning**: Multiple login failures, permission changes
- **Critical**: Backup failures, restore operations, corruption detected

### Anomaly Detection
- Unusual login locations (5+ unique IPs in 7 days)
- Excessive permission changes (10+)
- Multiple access denials (20+)

## File Structure

\`\`\`
├── app/
│   ├── page.tsx              # Login page
│   ├── admin/
│   │   └── page.tsx          # Admin dashboard
│   ├── dashboard/
│   │   └── page.tsx          # User dashboard
│   ├── api/
│   │   ├── auth/
│   │   ├── audit/
│   │   ├── system-events/
│   │   └── backup/
│   └── layout.tsx
├── components/
│   ├── admin/                # Admin UI components
│   ├── dashboard/            # User dashboard components
│   └── ui/                   # shadcn components
├── lib/
│   ├── auth-utils.ts         # Password & crypto utilities
│   ├── auth-service.ts       # Authentication logic
│   ├── audit-service.ts      # Audit logging
│   ├── enhanced-audit-service.ts
│   ├── access-control-service.ts
│   ├── role-management-service.ts
│   ├── backup-service.ts
│   ├── supabase-client.ts
│   └── supabase-server.ts
├── scripts/
│   └── 01-init-database.sql  # Database initialization
└── public/

\`\`\`

## Troubleshooting

### Issue: Database Connection Failed
- Verify Supabase URL and anon key in environment variables
- Check network connectivity to Supabase
- Ensure database is active in Supabase console

### Issue: Migration Script Not Running
- Manually execute SQL script in Supabase SQL editor
- Or use: `npm run db:migrate` (if configured)

### Issue: Login Always Fails
- Check password requirements in browser console
- Verify user exists in database
- Check audit logs for error details

### Issue: Backup Creation Fails
- Ensure sufficient disk space
- Verify database connectivity
- Check encryption configuration

## Security Best Practices

1. **Regularly rotate admin credentials**
2. **Enable MFA for all users**
3. **Review audit logs weekly**
4. **Test backup restoration monthly**
5. **Keep Supabase updated**
6. **Monitor for anomalies**
7. **Implement IP whitelisting for admin access**
8. **Use environment variables for sensitive data**

## Performance Optimization

- Database indexes created on frequently queried columns
- Audit log pagination (default: 50 records per page)
- Session expiration set to 24 hours
- OTP expiration set to 10 minutes

## Production Deployment

Before deploying to production:

1. Update environment variables in Vercel
2. Enable Row-Level Security (RLS) in Supabase
3. Set up SSL certificate
4. Configure firewall rules
5. Enable database backups in Supabase
6. Set up monitoring and alerting
7. Review and update security policies
8. Conduct security audit

## Support & Documentation

For more information:
- Next.js: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- TypeScript: https://www.typescriptlang.org/docs
- shadcn/ui: https://ui.shadcn.com

## License

This project is for educational purposes at ASTU.
