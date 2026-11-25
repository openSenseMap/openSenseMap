CREATE OR REPLACE PROCEDURE delete_expired_action_tokens()
LANGUAGE plpgsql
AS $func$
BEGIN
	DELETE FROM action_token
	WHERE expires_at < NOW() - INTERVAL '1 day';
END;
$func$;

SELECT cron.schedule(
	'delete-expired-action-tokens',
	'15 2 * * *',
	'CALL delete_expired_action_tokens()'
);