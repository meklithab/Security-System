# Security System - ASTU Computer System Security Project

A comprehensive full-stack security system implementing all required security measures for the Computer System Security course project at Addis Ababa Science and Technology University.

## Features

### Access Control & Authentication
- Mandatory Access Control (MAC) with data classification
- Discretionary Access Control (DAC) for resource ownership
- Role-Based Access Control (RBAC) with dynamic role changes
- Rule-Based Access Control (RuBAC) for time/location restrictions
- Attribute-Based Access Control (ABAC) for fine-grained policies
- Multi-Factor Authentication (MFA) with OTP
- Strong password policies with hashing

### Audit Trails & Logging
- User activity logging with encryption
- System event logging with severity levels
- Centralized log aggregation
- Alerting mechanisms for critical events
- Anomaly detection
- Compliance report generation
- Log export (CSV/JSON)

### Data Protection
- Encrypted backups (AES-256)
- Automated backup scheduling
- Backup integrity verification
- Data masking for sensitive information
- Retention policy enforcement

### User Interfaces
- Admin Dashboard: Complete access management
- User Dashboard: Profile and security settings
- Comprehensive activity monitoring

## Tech Stack

- **Frontend**: React 19.2, Next.js 16 (App Router)
- **Backend**: Next.js API Routes, Server Actions
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Custom auth with Bcrypt
- **Styling**: Tailwind CSS v4, shadcn/ui
- **Encryption**: Node.js crypto module

## Quick Start

\`\`\`bash
# 1. Install dependencies
npm install

# 2. Configure environment variables (Supabase integration)
# Environment variables are automatically set

# 3. Initialize database
# Run scripts/01-init-database.sql in Supabase SQL editor

# 4. Start development server
npm run dev
\`\`\`

Visit http://localhost:3000

## Demo Credentials

- **Admin**: admin@astu.edu.et / SecurePass123!
- **User**: employee@astu.edu.et / SecurePass123!

## Project Requirements Implemented

✅ Access Control and Authentication
- ✅ MAC with data classification
- ✅ DAC with file/record permissions
- ✅ RBAC with role management
- ✅ RuBAC with time/location rules
- ✅ ABAC with attribute-based policies

✅ Audit Trails and Logging
- ✅ User activity logging
- ✅ System event logging
- ✅ Log encryption
- ✅ Centralized logging
- ✅ Alerting mechanisms

✅ Data Backups
- ✅ Regular automated backups
- ✅ Backup encryption

✅ Identification and Authentication
- ✅ User registration with email verification
- ✅ CAPTCHA integration (ready)
- ✅ User profiles
- ✅ Biometric authentication (ready)

✅ Password Authentication
- ✅ Strong password policies
- ✅ Password hashing (Bcrypt)
- ✅ Account lockout protection
- ✅ Secure transmission (HTTPS)
- ✅ Password change mechanism

✅ Token-Based Authentication
- ✅ Session token management
- ✅ Token-based auth

✅ Multi-Factor Authentication
- ✅ Password authentication
- ✅ Email OTP (one-time passwords)

## Documentation

- [Setup Guide](./SETUP_GUIDE.md) - Detailed installation and configuration
- [API Documentation](./API.md) - API endpoints and usage
- [Security Architecture](./SECURITY.md) - Security design details

## License

Educational project for ASTU Computer System Security course.
