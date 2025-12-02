import { Resend } from "resend"
import nodemailer from "nodemailer"

/**
 * Email Service for sending OTP and verification emails
 * Supports multiple providers:
 * - Gmail SMTP (free, can send to any email)
 * - Resend (free tier with limitations)
 */

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

// Initialize Resend client
let resendClient: Resend | null = null

function getResendClient(): Resend | null {
  const RESEND_API_KEY = process.env.RESEND_API_KEY

  if (!RESEND_API_KEY) {
    return null
  }

  if (!resendClient) {
    resendClient = new Resend(RESEND_API_KEY)
  }

  return resendClient
}

// Gmail SMTP sender (alternative to Resend - no limitations!)
async function sendViaGmailSMTP(options: EmailOptions): Promise<boolean> {
  try {
    const GMAIL_USER = process.env.GMAIL_USER
    const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      console.log("⚠️ Gmail SMTP not configured (missing GMAIL_USER or GMAIL_APP_PASSWORD)")
      return false
    }

    // Remove spaces from app password if present
    const cleanPassword = GMAIL_APP_PASSWORD.replace(/\s/g, "")

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER.trim(),
        pass: cleanPassword,
      },
    })

    // Verify connection
    await transporter.verify()

    const mailOptions = {
      from: `Security System <${GMAIL_USER.trim()}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log("✅ Email sent successfully via Gmail SMTP")
    console.log("   Message ID:", info.messageId)
    console.log("   To:", options.to)
    return true
  } catch (error: any) {
    console.error("❌ Gmail SMTP error:")
    if (error.code === "EAUTH") {
      console.error("   Authentication failed. Check your Gmail App Password:")
      console.error("   1. Make sure 2-Step Verification is enabled")
      console.error("   2. Generate a new App Password at: https://myaccount.google.com/apppasswords")
      console.error("   3. Use the 16-character password (remove spaces)")
    } else if (error.code === "ECONNECTION") {
      console.error("   Connection failed. Check your internet connection.")
    } else {
      console.error("   Error details:", error.message || error)
    }
    return false
  }
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // Try Gmail SMTP first (no limitations, can send to any email)
    const gmailSuccess = await sendViaGmailSMTP(options)
    if (gmailSuccess) {
      return true
    }

    // Fallback to Resend if Gmail is not configured
    const client = getResendClient()

    if (client) {
      try {
        const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"

        // Resend free tier limitation: can only send to verified email when using onboarding@resend.dev
        // If using test domain, redirect to verified email for testing
        let recipientEmail = options.to
        const verifiedEmail = process.env.RESEND_VERIFIED_EMAIL || "mk543gg@gmail.com"

        if (fromEmail.includes("onboarding@resend.dev") || fromEmail.includes("resend.dev")) {
          // Using test domain - Resend only allows sending to your verified email
          if (options.to !== verifiedEmail) {
            console.warn(`⚠️ Resend Test Mode: Can only send to verified email (${verifiedEmail})`)
            console.warn(`   Original recipient: ${options.to}`)
            console.warn(`   Redirecting to: ${verifiedEmail}`)
            console.warn(`   💡 To send to other emails, use Gmail SMTP (see .env.local setup)`)
            recipientEmail = verifiedEmail
          }
        }

        const { data, error } = await client.emails.send({
          from: fromEmail,
          to: recipientEmail,
          subject: options.subject,
          html: options.html,
          text: options.text,
        })

        if (error) {
          console.error("❌ Resend API error:", error)
          // Fall through to console logging
        } else if (data) {
          if (recipientEmail !== options.to) {
            console.log(`✅ Email sent successfully via Resend to ${recipientEmail} (original: ${options.to})`)
            console.log(`   Email ID: ${data.id}`)
          } else {
            console.log("✅ Email sent successfully via Resend. Email ID:", data.id)
          }
          return true
        }
      } catch (resendError) {
        console.error("❌ Error calling Resend API:", resendError)
        // Fall through to console logging
      }
    }

    // Fallback: Log to console (for development or when email services are not configured)
    console.log("=".repeat(60))
    if (!process.env.GMAIL_USER && !process.env.RESEND_API_KEY) {
      console.log("📧 EMAIL (Console Mode - No email service configured)")
      console.log("💡 To send real emails, choose ONE option:")
      console.log("")
      console.log("   OPTION 1: Gmail SMTP (Recommended - No limitations!)")
      console.log("   1. Enable 2-Step Verification on your Gmail account")
      console.log("   2. Generate an App Password: https://myaccount.google.com/apppasswords")
      console.log("   3. Add to .env.local:")
      console.log("      GMAIL_USER=your-email@gmail.com")
      console.log("      GMAIL_APP_PASSWORD=your-16-char-app-password")
      console.log("")
      console.log("   OPTION 2: Resend (Free tier has limitations)")
      console.log("   1. Add RESEND_API_KEY=re_your_key_here to .env.local")
      console.log("   2. Note: Free tier only sends to verified email")
      console.log("")
    } else if (!process.env.GMAIL_USER) {
      console.log("📧 EMAIL (Console Mode - Gmail not configured, Resend failed)")
    } else {
      console.log("📧 EMAIL (Console Mode - Gmail SMTP failed, check credentials)")
    }
    console.log("To:", options.to)
    console.log("Subject:", options.subject)
    // Extract OTP from HTML for easier viewing
    const otpMatch = options.html.match(/<div class="otp-code">(\d+)<\/div>/)
    if (otpMatch) {
      console.log("OTP Code:", otpMatch[1])
    }
    console.log("Full Body:", options.text || options.html.replace(/<[^>]*>/g, ""))
    console.log("=".repeat(60))
    return true
  } catch (error) {
    console.error("❌ Error sending email:", error)
    return false
  }
}

export async function sendOTPEmail(email: string, otp: string, userName?: string): Promise<boolean> {
  const subject = "Your One-Time Password (OTP) for Login"
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 30px; border-radius: 8px; margin: 20px 0; }
        .otp-box { background: white; border: 2px solid #1e40af; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
        .otp-code { font-size: 32px; font-weight: bold; color: #1e40af; letter-spacing: 8px; font-family: monospace; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Security System - OTP Verification</h1>
        </div>
        <div class="content">
          <p>Hello ${userName || "User"},</p>
          <p>You have requested to log in to your account. Use the following One-Time Password (OTP) to complete your login:</p>
          
          <div class="otp-box">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Your OTP Code:</p>
            <div class="otp-code">${otp}</div>
          </div>

          <div class="warning">
            <strong>⚠️ Security Notice:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>This OTP is valid for 5 minutes only</li>
              <li>Never share this code with anyone</li>
              <li>If you didn't request this, please ignore this email</li>
            </ul>
          </div>

          <p>If you didn't request this OTP, please contact support immediately.</p>
        </div>
        <div class="footer">
          <p>Addis Ababa Science and Technology University<br>
          Department of Software Engineering<br>
          Computer System Security Project</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
Security System - OTP Verification

Hello ${userName || "User"},

You have requested to log in to your account. Use the following One-Time Password (OTP) to complete your login:

OTP Code: ${otp}

⚠️ Security Notice:
- This OTP is valid for 5 minutes only
- Never share this code with anyone
- If you didn't request this, please ignore this email

If you didn't request this OTP, please contact support immediately.

---
Addis Ababa Science and Technology University
Department of Software Engineering
Computer System Security Project
  `

  return sendEmail({
    to: email,
    subject,
    html,
    text,
  })
}

export async function sendVerificationEmail(email: string, userName: string, verificationToken: string): Promise<boolean> {
  const subject = "Verify Your Email Address"
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/verify-email?token=${verificationToken}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 30px; border-radius: 8px; margin: 20px 0; }
        .button { display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✉️ Verify Your Email Address</h1>
        </div>
        <div class="content">
          <p>Hello ${userName},</p>
          <p>Thank you for registering with our Security System. Please verify your email address by clicking the button below:</p>
          <a href="${verificationUrl}" class="button">Verify Email Address</a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #6b7280;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
        </div>
        <div class="footer">
          <p>Addis Ababa Science and Technology University<br>
          Department of Software Engineering</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
Verify Your Email Address

Hello ${userName},

Thank you for registering with our Security System. Please verify your email address by visiting:

${verificationUrl}

This link will expire in 24 hours.

---
Addis Ababa Science and Technology University
Department of Software Engineering
  `

  return sendEmail({
    to: email,
    subject,
    html,
    text,
  })
}

