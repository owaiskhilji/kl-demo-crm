-- ============================================================
-- WhatsApp System User Token — One-time Setup Script
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================
-- IMPORTANT: Replace the placeholders below with your real values
--   PHONE_NUMBER_ID  → from Meta Business Manager → WhatsApp → API Setup
--   SYSTEM_USER_TOKEN → the permanent System User token you generated
--
-- token_expires_at = NULL means "never expires" — the daily cron will
-- skip this row entirely and never try to rotate it.
-- ============================================================

INSERT INTO integration_connections (
  channel,
  phone_number_id,
  access_token,      -- This must be the ENCRYPTED token (see note below)
  token_expires_at,  -- NULL = permanent, never needs refresh
  status
)
VALUES (
  'whatsapp',
  '1185072558030453',
  '5f67d0fedf5a17789308d66e517b31db:92ad98cd8686714f5a6fc4b51b5d6a5e:6eedff089d3e4b31c317909f2c31593549d5ccef3bacac7c91b71e9d6653ccbd0fbd093f13600295f0848b990b3697745e4a90f6cc43fd34264d64b30b9115e00b7b7d0899f217e1c10405d4bbff0cbcf50fd55a9e1ecc49796b40dd0cd0a69b986561aa81ccfcc895ec2000597623f36c30cb23a89233e4587fc0bdb2c6240243f9f33d54935384314623b8268601cfade69fb9c37688b57d5b7ca56d475bf3522850a94ba479cc7fd3642f877e69588d85a6453cdf146a10b96bd5feae9ebc1d3a9142fe931846e427f4e85977644f429c15721dcdb4fb0435f27e353ffc7541710d237a7432283cef1cc5a2',  -- See Step 2 below for how to get this
  NULL,
  'active'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- HOW TO ENCRYPT YOUR TOKEN BEFORE INSERTING:
--
-- decrypt() in lib/utils/encryption.ts expects EXACTLY this format:
--   iv:authTag:ciphertext   (colon-separated, all hex, 16-byte IV)
--
-- Run this Node.js command locally (replace the two placeholders):
--
--   node -e "
--     const c=require('crypto');
--     const k=Buffer.from('YOUR_64_CHAR_ENCRYPTION_KEY','hex');
--     const iv=c.randomBytes(16);
--     const ci=c.createCipheriv('aes-256-gcm',k,iv);
--     const enc=Buffer.concat([ci.update('YOUR_WA_SYSTEM_TOKEN','utf8'),ci.final()]);
--     const tag=ci.getAuthTag();
--     console.log(iv.toString('hex')+':'+tag.toString('hex')+':'+enc.toString('hex'));
--   "
--
-- Output format:  <32-char iv>:<32-char authTag>:<ciphertext>
-- Copy that output and paste it as 'YOUR_ENCRYPTED_TOKEN' above.
--
-- ⚠️ Common mistakes to avoid:
--   - Do NOT use randomBytes(12) — must be 16 bytes
--   - Order is iv:authTag:ciphertext  (NOT iv:ciphertext:authTag)
--   - Use your actual ENCRYPTION_KEY from .env.local / Vercel
-- ============================================================
