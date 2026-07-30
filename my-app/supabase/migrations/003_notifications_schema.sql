CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('follow_up_due','lead_assigned','integration_expired')),
  follow_up_id UUID REFERENCES follow_ups(id) ON DELETE CASCADE,
  lead_id      UUID REFERENCES leads(id) ON DELETE CASCADE,
  message      TEXT NOT NULL,
  due_at       TIMESTAMPTZ,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','due','seen','dismissed')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX notifications_agent_status_idx ON notifications (agent_id, status, due_at);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents can read own notifications" ON notifications
  FOR SELECT USING (agent_id = auth.uid());

CREATE POLICY "agents can update own notifications" ON notifications
  FOR UPDATE USING (agent_id = auth.uid());
