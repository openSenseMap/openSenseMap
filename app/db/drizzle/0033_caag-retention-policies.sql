-- Add tiered retention policies for measurement continuous aggregates

SELECT add_retention_policy(
  'measurement_10min',
  drop_after => INTERVAL '12 months',
  if_not_exists => TRUE
);

SELECT add_retention_policy(
  'measurement_1hour',
  drop_after => INTERVAL '18 months',
  if_not_exists => TRUE
);

SELECT add_retention_policy(
  'measurement_1day',
  drop_after => INTERVAL '24 months',
  if_not_exists => TRUE
);

SELECT add_retention_policy(
  'measurement_1month',
  drop_after => INTERVAL '24 months',
  if_not_exists => TRUE
);

SELECT add_retention_policy(
  'measurement_1year',
  drop_after => INTERVAL '24 months',
  if_not_exists => TRUE
);