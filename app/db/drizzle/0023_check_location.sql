-- Custom SQL migration file, put your code below! --
ALTER TABLE location
    ADD CONSTRAINT check_location CHECK (
			ST_X(location) >= -180 AND
			ST_X(location) < 180 AND
			ST_Y(location) BETWEEN -90 AND 90
    );