import 'dotenv/config'

export const env = {
	MQTT_SERVICE_URL: process.env.MQTT_SERVICE_URL!,
	MQTT_SERVICE_KEY: process.env.MQTT_SERVICE_KEY!,
}
