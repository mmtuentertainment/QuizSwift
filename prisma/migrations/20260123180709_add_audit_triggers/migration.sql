-- Audit trigger function that captures all data modifications
-- Sets PostgreSQL session variables from application context for actor tracking
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  actor_id TEXT;
  actor_type TEXT;
  ip_addr TEXT;
  user_agent_str TEXT;
BEGIN
  -- Get actor context from session variables (set by application via set_config)
  -- The 'true' parameter in current_setting makes it return NULL if not set (instead of error)
  actor_id := current_setting('app.current_user_id', true);
  actor_type := current_setting('app.current_user_type', true);
  ip_addr := current_setting('app.current_ip', true);
  user_agent_str := current_setting('app.current_user_agent', true);

  IF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_log (id, table_name, record_id, action, actor_id, actor_type, old_data, ip_address, user_agent, created_at)
    VALUES (
      gen_random_uuid()::text,
      TG_TABLE_NAME,
      OLD.id::text,
      'DELETE',
      actor_id,
      actor_type,
      row_to_json(OLD),
      ip_addr,
      user_agent_str,
      NOW()
    );
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_log (id, table_name, record_id, action, actor_id, actor_type, old_data, new_data, ip_address, user_agent, created_at)
    VALUES (
      gen_random_uuid()::text,
      TG_TABLE_NAME,
      NEW.id::text,
      'UPDATE',
      actor_id,
      actor_type,
      row_to_json(OLD),
      row_to_json(NEW),
      ip_addr,
      user_agent_str,
      NOW()
    );
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_log (id, table_name, record_id, action, actor_id, actor_type, new_data, ip_address, user_agent, created_at)
    VALUES (
      gen_random_uuid()::text,
      TG_TABLE_NAME,
      NEW.id::text,
      'INSERT',
      actor_id,
      actor_type,
      row_to_json(NEW),
      ip_addr,
      user_agent_str,
      NOW()
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Attach audit trigger to User table (sensitive PII data)
-- Note: Prisma creates table as "User" (quoted, case-sensitive)
DROP TRIGGER IF EXISTS audit_user_trigger ON "User";
CREATE TRIGGER audit_user_trigger
AFTER INSERT OR UPDATE OR DELETE ON "User"
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
