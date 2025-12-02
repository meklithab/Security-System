UPDATE users
SET failed_login_attempts = 0,
    account_locked_until = NULL,
    is_active = TRUE,
    mfa_enabled = FALSE
WHERE email = 'admin@astu.edu.et';
