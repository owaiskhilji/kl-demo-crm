CREATE TABLE integration_connections (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel          TEXT NOT NULL CHECK (channel IN ('facebook','whatsapp','instagram')),
  page_id          TEXT,
  waba_id          TEXT,
  phone_number_id  TEXT,
  access_token     TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  status           TEXT DEFAULT 'active' CHECK (status IN ('active','expired','revoked')),
  connected_by     UUID REFERENCES profiles(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE message_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      UUID REFERENCES leads(id) ON DELETE CASCADE,
  channel      TEXT NOT NULL CHECK (channel IN ('whatsapp','instagram','facebook')),
  direction    TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  message_type TEXT,
  content      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE integration_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_log ENABLE ROW LEVEL SECURITY;

-- integration_connections is server-only (so no client policies needed, meaning default deny holds).
-- message_log can be read by agents viewing their leads
CREATE POLICY "read access for message_log" ON message_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = message_log.lead_id
      AND (
        leads.assigned_to = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
      )
    )
  );

CREATE POLICY "insert access for message_log" ON message_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = message_log.lead_id
      AND (
        leads.assigned_to = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
      )
    )
  );
