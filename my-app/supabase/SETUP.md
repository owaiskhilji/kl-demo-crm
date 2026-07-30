# KL Demo CRM — Supabase Setup Guide

## Fresh Client Setup

**New Supabase project ke liye yeh 9 files ko EXACTLY is order mein run karein.**

Supabase Dashboard → SQL Editor → New Query → File paste karein → Run.

---

## Migration Order (Run Karne Ka Sequence)

| # | File | Kya Karta Hai |
|---|------|--------------|
| 1 | `001_schema.sql` | **Saari tables + final RLS policies** (profiles, leads, follow_ups, properties, lead_activities) |
| 2 | `002_integrations_schema.sql` | integration_connections + message_log tables (Meta/WhatsApp/Instagram) |
| 3 | `003_notifications_schema.sql` | notifications table + RLS (in-app bell alerts) |
| 4 | `004_audit_logs.sql` | audit_logs table (agent created, password reset, bulk reassign logs) |
| 5 | `005_dashboard_views.sql` | Dashboard ke liye SQL views (lead sources, weekly volume, agent performance) |
| 6 | `006_enable_realtime.sql` | notifications table ko Supabase Realtime mein add karta hai |
| 7 | `007_auto_assignment_rpc.sql` | `get_least_loaded_agent()` function (auto lead distribution) |
| 8 | `008_cron_rpc.sql` | `process_due_follow_ups()` function (daily cron for follow-up notifications) |
| 9 | `009_storage_bucket.sql` | property-images Storage bucket + upload/read policies |

---

## Migration ke Baad — Manual Steps

Yeh cheezein SQL se nahi hoti, manually karni hogi:

### 1. Owner Account Banana
Supabase Dashboard → Authentication → Users → "Add User" se pehla Owner account banayein, phir:
```sql
INSERT INTO profiles (id, full_name, role)
VALUES ('<auth-user-id-here>', 'Owner Name', 'owner');
```

### 2. Supabase Realtime Enable karna
Dashboard → Database → Replication → `notifications` table ko enable karein (006 file ne SQL se try kiya, lekin manually confirm kar lein).

### 3. Vercel Cron Job Setup
`vercel.json` mein cron job already configured hai jo `/api/notifications/cron` endpoint ko daily trigger karta hai.

### 4. Environment Variables (`.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
META_APP_ID=
META_APP_SECRET=
WEBHOOK_VERIFY_TOKEN=
ENCRYPTION_KEY=
NEXT_PUBLIC_APP_URL=
FACEBOOK_PAGE_ACCESS_TOKEN=
```

---

## Archive Folder

`supabase/archive/` mein purani fix/seed files hain — **inhe naye project par RUN MAT KAREIN**.
Yeh sirf reference ke liye rakhi gayi hain (kya changes aaye the aur kyon).
