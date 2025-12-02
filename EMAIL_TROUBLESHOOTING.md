# Email Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: "Gmail SMTP not configured"
**Error:** `⚠️ Gmail SMTP not configured (missing GMAIL_USER or GMAIL_APP_PASSWORD)`

**Solution:**
1. Check your `.env.local` file exists in project root
2. Make sure it contains:
   ```bash
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=your-16-char-password
   ```
3. **Restart your dev server** after adding env variables
4. No quotes, no spaces around `=`

### Issue 2: "Authentication failed" (EAUTH error)
**Error:** `❌ Gmail SMTP error: Authentication failed`

**Solution:**
1. **Enable 2-Step Verification:**
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate App Password:**
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Name it "Security System"
   - Copy the 16-character password

3. **Update .env.local:**
   ```bash
   GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx
   ```
   - Remove spaces if present
   - Use the exact 16-character password

4. **Restart server**

### Issue 3: "Connection failed" (ECONNECTION error)
**Error:** `❌ Gmail SMTP error: Connection failed`

**Solution:**
- Check internet connection
- Check firewall isn't blocking port 587
- Try again in a few minutes (Gmail may have rate limits)

### Issue 4: Emails not arriving
**No error, but emails don't arrive**

**Check:**
1. **Spam folder** - Check junk/spam folder
2. **Console output** - Look for `✅ Email sent successfully`
3. **Email address** - Verify the recipient email is correct
4. **Gmail limits** - Gmail allows ~500 emails/day

### Issue 5: "Cannot find module 'nodemailer'"
**Error:** `Error: Cannot find module 'nodemailer'`

**Solution:**
```bash
npm install nodemailer @types/nodemailer
```

### Issue 6: Environment variables not loading
**Variables set but not working**

**Solution:**
1. File must be named `.env.local` (not `.env`)
2. Must be in project root (same folder as `package.json`)
3. **Restart dev server** after changes
4. No spaces around `=` sign
5. No quotes needed (unless value has spaces)

### Issue 7: Still using Resend instead of Gmail
**Emails going to verified email only**

**Solution:**
1. Make sure Gmail is configured first (it's tried first)
2. Check console - should see "✅ Email sent successfully via Gmail SMTP"
3. If you see Resend messages, Gmail config is missing/wrong

## Quick Checklist

- [ ] `.env.local` file exists in project root
- [ ] `GMAIL_USER` is set (your full Gmail address)
- [ ] `GMAIL_APP_PASSWORD` is set (16 characters, no spaces)
- [ ] 2-Step Verification is enabled on Gmail
- [ ] App Password was generated (not regular password)
- [ ] Dev server was restarted after adding env vars
- [ ] Nodemailer is installed: `npm install nodemailer @types/nodemailer`
- [ ] Check console for error messages

## Testing

1. **Enable MFA** for a test user
2. **Try to log in**
3. **Check console** for:
   - `✅ Email sent successfully via Gmail SMTP` = Success!
   - `❌ Gmail SMTP error:` = Check error message above
   - `⚠️ Gmail SMTP not configured` = Check .env.local

4. **Check email inbox** (and spam folder)

## Still Not Working?

1. **Check console output** - Copy the exact error message
2. **Verify .env.local format:**
   ```bash
   GMAIL_USER=mk543gg@gmail.com
   GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
   ```
   (Remove spaces from password: `abcdefghijklmnop`)

3. **Test Gmail connection:**
   - Try logging into Gmail in browser
   - Make sure account isn't locked

4. **Regenerate App Password:**
   - Delete old one
   - Create new one
   - Update .env.local

## Alternative: Use Resend (if Gmail doesn't work)

If Gmail SMTP continues to fail, you can use Resend:
1. Keep `RESEND_API_KEY` in `.env.local`
2. Remove or comment out Gmail variables
3. Note: Resend free tier only sends to verified email

