CREATE OR REPLACE PROCEDURE cleanup_expired_tos_users()
LANGUAGE plpgsql
AS $$
DECLARE
  v_required_tos_version_id text;
BEGIN
  SELECT tv.id
  INTO v_required_tos_version_id
  FROM tos_version tv
  WHERE tv.effective_from <= now()
    AND tv.accept_by < now()
  ORDER BY tv.effective_from DESC, tv.accept_by DESC
  LIMIT 1;

  IF v_required_tos_version_id IS NULL THEN
    RETURN;
  END IF;

  CREATE TEMP TABLE tmp_users_to_delete (
    id text PRIMARY KEY
  ) ON COMMIT DROP;

  INSERT INTO tmp_users_to_delete (id)
  SELECT u.id
  FROM "user" u
  LEFT JOIN tos_user_state tus
    ON tus.user_id = u.id
   AND tus.tos_version_id = v_required_tos_version_id
   AND tus.accepted_at IS NOT NULL
  WHERE u.id <> 'system_orphan_user'
    AND tus.user_id IS NULL;

  UPDATE device
  SET
    user_id = 'system_orphan_user',
    orphaned_at = now(),
    updated_at = now()
  WHERE user_id IN (SELECT id FROM tmp_users_to_delete);

  DELETE FROM "user"
  WHERE id IN (SELECT id FROM tmp_users_to_delete);
END;
$$;

SELECT cron.schedule(
  'cleanup_expired_tos_users',
  '0 3 * * *',
  $$CALL cleanup_expired_tos_users();$$
);