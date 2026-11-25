CREATE INDEX "sensor_device_id_idx" ON "sensor" USING btree ("device_id");--> statement-breakpoint
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname IN ('sensor-update-status', 'device-update-status');--> statement-breakpoint
DROP PROCEDURE IF EXISTS update_sensor_status();--> statement-breakpoint
DROP PROCEDURE IF EXISTS update_device_status();
