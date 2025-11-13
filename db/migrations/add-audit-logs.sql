-- Add audit_logs table for comprehensive system auditing
-- Created: 2025-11-13
-- Purpose: Track all critical operations (login, availability, crew assignment, alarms, AAO)

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  event_time TIMESTAMP NOT NULL DEFAULT NOW(),
  actor_id TEXT,
  actor_role TEXT,
  actor_ip TEXT,
  actor_agent TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  severity TEXT NOT NULL DEFAULT 'info',
  metadata JSONB,
  request_id TEXT,
  source TEXT NOT NULL DEFAULT 'api'
);

-- Index for fast queries by time and actor
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_time ON audit_logs(event_time DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Comment for documentation
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all critical EVT operations';
COMMENT ON COLUMN audit_logs.actor_id IS 'User ID who performed the action (NULL for system actions)';
COMMENT ON COLUMN audit_logs.action IS 'Action type: login_success, login_failed, logout, availability_changed, crew_assignment_automatic, alarm_received, alarm_simulated, aao_created, aao_updated';
COMMENT ON COLUMN audit_logs.severity IS 'Severity level: info (default), warning (failures, alarms), error';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context as JSON (changes, identifiers, NOT sensitive data)';
COMMENT ON COLUMN audit_logs.source IS 'Event source: api (default), webhook, scheduler';
