-- Stored procedure to import MongoDB exports
CREATE OR REPLACE PROCEDURE delete_temporary_devices()
LANGUAGE plpgsql
AS $func$
DECLARE
	affected_rows INT;
BEGIN
	SELECT * FROM device WHERE expires_at IS NOT NULL AND expires_at <= NOW()::TIMESTAMP::date;

--  Not sure if we should use this or just ignore how many ROWS were deleted!
--	GET DIAGNOSTICS affected_rows = ROW_COUNT;
--	INSERT INTO logtable VALUES(affected_rows);
END;
$func$;

-- Call stored procedure to update device status every 7 minutes
SELECT cron.schedule('delete-temporary-devices', '0 2 * * *', 'CALL delete_temporay_devices()');