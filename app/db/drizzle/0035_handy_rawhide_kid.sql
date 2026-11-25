CREATE OR REPLACE PROCEDURE archive_inactive_devices()
LANGUAGE SQL
AS $$
  UPDATE device d
  SET
    archived_at = now(),
    updated_at = now()
  WHERE d.archived_at IS NULL
    AND d.created_at < now() - interval '12 months'
    AND NOT EXISTS (
      SELECT 1
      FROM sensor s
      JOIN measurement m ON m.sensor_id = s.id
      WHERE s.device_id = d.id
        AND m.time >= now() - interval '12 months'
    );
$$;

SELECT cron.schedule(
  'device-archive-inactive',
  '0 2 * * *',
  'CALL archive_inactive_devices()'
);