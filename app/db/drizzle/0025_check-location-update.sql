-- Custom SQL migration file, put your code below! --
ALTER TABLE location
    DROP CONSTRAINT check_location;

ALTER TABLE location
    ADD CONSTRAINT check_location CHECK (
			ST_X(location) BETWEEN -180 AND 180 
            AND
			ST_Y(location) BETWEEN -90 AND 90
    );-- Custom SQL migration file, put your code below! --