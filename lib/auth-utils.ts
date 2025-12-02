import bcrypt from "bcryptjs"
import crypto from "crypto"

// Password validation utility
export function validatePassword(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Minimum 12 characters
  if (password.length < 12) {
    errors.push("Password must be at least 12 characters long")
  }

  // At least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter")
  }

  // At least one lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter")
  }

  // At least one number
  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number")
  }

  // At least one special character
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push("Password must contain at least one special character")
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// Hash password with bcrypt
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12)
  return bcrypt.hash(password, salt)
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Generate OTP
export function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString()
}

// Hash OTP for storage
export function hashOTP(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex")
}

// Generate secure random token
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

// Generate MFA Secret (for TOTP/Google Authenticator)
export function generateMFASecret(): string {
  return crypto.randomBytes(32).toString("base64")
}

