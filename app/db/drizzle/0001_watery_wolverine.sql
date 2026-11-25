-- Custom SQL migration file, put you code below! --

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Stored procedure to update Sensor status
CREATE OR REPLACE PROCEDURE update_sensor_status()
LANGUAGE SQL
AS $$
	UPDATE sensor
	SET status = CASE
		WHEN (SELECT max(time) FROM measurement WHERE sensor.id = measurement.sensor_id) > now() - interval '7 days' THEN 'active'::status
		WHEN (SELECT max(time) FROM measurement WHERE sensor.id = measurement.sensor_id) > now() - interval '30 days' AND (SELECT max(time) FROM measurement WHERE sensor.id = measurement.sensor_id) < now() - interval '8 days' THEN 'inactive'::"status"
		ELSE 'old'::"status"
	END;
$$;

-- Call stored procedure to update sensor status every 5 minutes
SELECT cron.schedule('sensor-update-status', '*/5 * * * *', 'CALL update_sensor_status()');

-- Stored procedure to set Device status
CREATE OR REPLACE PROCEDURE update_device_status()
LANGUAGE SQL
AS $$
	UPDATE device SET status='old'
	WHERE EXISTS (
		SELECT * FROM sensor WHERE device.id=sensor.device_id AND status='old'
	);

	UPDATE device SET status='inactive'
	WHERE EXISTS (
		SELECT * FROM sensor WHERE device.id=sensor.device_id AND status='inactive'
	);

	UPDATE device SET status='active'
	WHERE EXISTS (
		SELECT * FROM sensor WHERE device.id=sensor.device_id AND status='active'
	);
$$;

-- Call stored procedure to update device status every 7 minutes
SELECT cron.schedule('device-update-status', '*/7 * * * *', 'CALL update_device_status()');