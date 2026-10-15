CREATE TABLE "sensor_wiki_alias" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"sensor_wiki_phenomenon" text NOT NULL,
	"sensor_wiki_unit" text,
	"title" text NOT NULL,
	"unit" text,
	"title_aliases" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"unit_aliases" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"sensor_type_aliases" text[] DEFAULT ARRAY[]::text[] NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sensor_wiki_alias_key_unique" ON "sensor_wiki_alias" USING btree ("key");--> statement-breakpoint
CREATE INDEX "sensor_wiki_alias_phenomenon_idx" ON "sensor_wiki_alias" USING btree ("sensor_wiki_phenomenon");--> statement-breakpoint
INSERT INTO "sensor_wiki_alias" ("id", "key", "sensor_wiki_phenomenon", "sensor_wiki_unit", "title", "unit", "title_aliases", "unit_aliases", "sensor_type_aliases") VALUES
	('bundled:temperature:Cel', 'temperature:Cel', 'temperature', 'Cel', 'Temperature', '°C', ARRAY['air temperature', 'bodentemperatur', 'bodentemperatur 10cm', 'bodentemperatur 30cm', 'bodentemperatur_1', 'bodentemperatur_2', 'lufttemperatur', 'temperatur', 'temperatur bme280', 'temperatur dht22', 'temperatur heca', 'temperatur scd30', 'temperatura', 'temperature', 'temperature bme280', 'temperature dht22', 'temperature heca', 'temperature scd30', 'temp']::text[], ARRAY['c', 'cel', 'celsius', 'degc', 'degree celsius', '°c']::text[], ARRAY[]::text[]),
	('bundled:relative_humidity:%', 'relative_humidity:%', 'relative_humidity', '%', 'Relative humidity', '%', ARRAY['humidity', 'luftfeuchte', 'luftfeuchtigkeit', 'rel luftfeuchte', 'rel luftfeuchte bme280', 'rel luftfeuchte dht22', 'rel luftfeuchte heca', 'rel luftfeuchte scd30', 'rel. luftfeuchte', 'rel. luftfeuchte bme280', 'rel. luftfeuchte dht22', 'rel. luftfeuchte heca', 'rel. luftfeuchte scd30', 'rel luftfeuchtigkeit', 'rel. luftfeuchtigkeit', 'relative humidity']::text[], ARRAY['%', '%rh', 'percent', 'rh']::text[], ARRAY[]::text[]),
	('bundled:barometric_pressure:hPa', 'barometric_pressure:hPa', 'barometric_pressure', 'hPa', 'Barometric pressure', 'hPa', ARRAY['air pressure', 'atm luftdruck', 'atm. luftdruck', 'barametric pressure', 'barometric pressure', 'luftdruck absolut', 'luftdruck bme280', 'luftdruck bmp', 'luftdruck relativ', 'luftdruck', 'presion atmosferica', 'presión atmosferica', 'pressure']::text[], ARRAY['hpa', 'inhg', 'mbar']::text[], ARRAY[]::text[]),
	('bundled:barometric_pressure:Pa', 'barometric_pressure:Pa', 'barometric_pressure', 'Pa', 'Barometric pressure', 'Pa', ARRAY['air pressure', 'atm luftdruck', 'atm. luftdruck', 'barametric pressure', 'barometric pressure', 'luftdruck bme280', 'luftdruck bmp', 'luftdruck', 'presion atmosferica', 'presión atmosferica', 'pressure']::text[], ARRAY['pa']::text[], ARRAY[]::text[]),
	('bundled:pm10:ug/m3', 'pm10:ug/m3', 'pm10', 'ug/m3', 'PM10', 'µg/m³', ARRAY['feinstaub pm10', 'particle 10', 'particulate matter 10', 'pm 10', 'pm10']::text[], ARRAY['ug/m3', 'µg/m³', 'μg/m³']::text[], ARRAY[]::text[]),
	('bundled:pm25:ug/m3', 'pm25:ug/m3', 'pm25', 'ug/m3', 'PM2.5', 'µg/m³', ARRAY['particle 2 5', 'particle 2,5', 'particulate matter 2 5', 'particulate matter 2.5', 'feinstaub pm2 5', 'feinstaub pm2.5', 'pm 2 5', 'pm 2.5', 'pm2 5', 'pm2.5', 'pm25']::text[], ARRAY['ug/m3', 'µg/m³', 'μg/m³']::text[], ARRAY[]::text[]),
	('bundled:ambient_light:lx', 'ambient_light:lx', 'ambient_light', 'lx', 'Ambient light', 'lx', ARRAY['ambient light', 'beleuchtungsstarke', 'beleuchtungsstärke', 'helligkeit', 'illuminance', 'light']::text[], ARRAY['lux', 'lx']::text[], ARRAY[]::text[]),
	('bundled:ultraviolet_a_light:uW/cm2', 'ultraviolet_a_light:uW/cm2', 'ultraviolet_a_light', 'uW/cm2', 'UV intensity', 'µW/cm²', ARRAY['uv intensitat', 'uv intensität', 'uv intensity']::text[], ARRAY['uw/cm2', 'uw/cm²', 'µw/cm2', 'µw/cm²', 'μw/cm2', 'μw/cm²']::text[], ARRAY[]::text[]),
	('bundled:ultraviolet_a_light:W/m²', 'ultraviolet_a_light:W/m²', 'ultraviolet_a_light', 'W/m²', 'Ultraviolet A light', 'W/m²', ARRAY['ultraviolet a light']::text[], ARRAY['w/m2', 'w/m²']::text[], ARRAY[]::text[]),
	('bundled:soil_moisture:%', 'soil_moisture:%', 'soil_moisture', '%', 'Soil moisture', '%', ARRAY['bodenfeuchte', 'bodenfeuchte 10cm', 'bodenfeuchte 30cm', 'bodenfeuchte 60cm', 'bodenfeuchte_1', 'bodenfeuchte_2', 'soil moisture']::text[], ARRAY['%', 'percent']::text[], ARRAY[]::text[]),
	('bundled:co2:ppm', 'co2:ppm', 'co2', 'ppm', 'CO2', 'ppm', ARRAY['carbon dioxide', 'co2']::text[], ARRAY['parts per million', 'ppm']::text[], ARRAY[]::text[]),
	('bundled:humidity:', 'humidity:', 'humidity', NULL, 'Humidity', NULL, ARRAY['humedad', 'humidity']::text[], ARRAY[]::text[], ARRAY[]::text[]),
	('bundled:pm10_concentration:ug/m3', 'pm10_concentration:ug/m3', 'pm10_concentration', 'ug/m3', 'PM10 concentration', 'µg/m³', ARRAY['particulate matter 10 concentration', 'pm10 concentration']::text[], ARRAY['ug/m3', 'µg/m³', 'μg/m³']::text[], ARRAY[]::text[]),
	('bundled:air_temperature:°C', 'air_temperature:°C', 'air_temperature', '°C', 'Air temperature', '°C', ARRAY['air temperature']::text[], ARRAY['c', 'cel', 'celsius', 'degc', 'degree celsius', '°c']::text[], ARRAY[]::text[]),
	('bundled:precipitation:mm', 'precipitation:mm', 'precipitation', 'mm', 'Precipitation', 'mm', ARRAY['niederschlag', 'precipitation', 'rain rate', 'rainfall', 'regen stunde', 'regen tag', 'regenrate']::text[], ARRAY['in/hr', 'millimeter', 'mm', 'mm/d', 'mm/h']::text[], ARRAY[]::text[]),
	('bundled:volatile_organic_compound_voc:', 'volatile_organic_compound_voc:', 'volatile_organic_compound_voc', NULL, 'Volatile organic compound (VOC)', NULL, ARRAY['tvoc', 'voc', 'volatile organic compound voc']::text[], ARRAY[]::text[], ARRAY[]::text[]),
	('bundled:voltage:V', 'voltage:V', 'voltage', 'V', 'Voltage', 'V', ARRAY['batteriespannung', 'battery voltage', 'betriebsspannung', 'power supply', 'solar voltage', 'spannung', 'voltage']::text[], ARRAY['mv', 'millivolt', 'v', 'volt']::text[], ARRAY[]::text[]),
	('bundled:sound_level:', 'sound_level:', 'sound_level', NULL, 'Sound level', NULL, ARRAY['durchschnitt umgebungslautstarke', 'durchschnitt umgebungslautstärke', 'lautstarke', 'lautstärke', 'minimum umgebungslautstarke', 'minimum umgebungslautstärke', 'noise', 'sound level', 'soundpresure dba', 'soundpressure dba']::text[], ARRAY['db', 'dba', 'dbavg', 'dbmin']::text[], ARRAY[]::text[]),
	('bundled:water_level:', 'water_level:', 'water_level', NULL, 'Water level', NULL, ARRAY['pegel', 'water level']::text[], ARRAY[]::text[], ARRAY[]::text[]),
	('bundled:water_temperature:', 'water_temperature:', 'water_temperature', NULL, 'Water temperature', NULL, ARRAY['water temperature']::text[], ARRAY[]::text[], ARRAY[]::text[]),
	('bundled:wind_direction:', 'wind_direction:', 'wind_direction', NULL, 'Wind direction', NULL, ARRAY['wind direction', 'windrichtung']::text[], ARRAY[]::text[], ARRAY[]::text[]),
	('bundled:wind_speed:m/s', 'wind_speed:m/s', 'wind_speed', 'm/s', 'Wind speed', 'm/s', ARRAY['viento', 'wind boen', 'wind böen', 'wind gust speed', 'wind speed', 'windboen', 'windböen', 'windgeschwindigkeit', 'windstarke', 'windstärke']::text[], ARRAY['m/s', 'meter per second', 'miles per hour', 'mph']::text[], ARRAY[]::text[])
ON CONFLICT ("key") DO NOTHING;
