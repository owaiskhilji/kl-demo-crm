-- Dashboard views with security_invoker = true so they strictly respect RLS!

-- 1. Lead Counts by Source
CREATE OR REPLACE VIEW view_dashboard_lead_sources WITH (security_invoker = true) AS
SELECT
  source,
  COUNT(*) as count
FROM leads
GROUP BY source;

-- 2. Weekly Lead Volume (Last 7 Days)
CREATE OR REPLACE VIEW view_dashboard_weekly_volume WITH (security_invoker = true) AS
SELECT
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as count
FROM leads
WHERE created_at >= DATE_TRUNC('day', NOW() - INTERVAL '6 days')
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY DATE_TRUNC('day', created_at) ASC;

-- 3. Agent Performance
CREATE OR REPLACE VIEW view_dashboard_agent_performance WITH (security_invoker = true) AS
SELECT
  p.id as agent_id,
  p.full_name as agent_name,
  COUNT(l.id) as assigned_leads,
  COUNT(l.id) FILTER (WHERE l.stage = 'closed') as closed_deals
FROM profiles p
LEFT JOIN leads l ON l.assigned_to = p.id
WHERE p.role = 'agent'
GROUP BY p.id, p.full_name;
