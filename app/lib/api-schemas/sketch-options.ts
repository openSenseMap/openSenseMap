import * as z from 'zod/v4'

const SketchPortSchema = z.enum(['A', 'B', 'C'])

export const SketchOptionsSchema = z
	.object({
		serialPort: z.enum(['Serial1', 'Serial2']).optional().meta({
			description: 'Serial port the SDS011 sensor is connected to.',
			example: 'Serial1',
		}),
		soilDigitalPort: SketchPortSchema.optional().meta({
			description: 'Digital port the SMT50 sensor is connected to.',
			example: 'A',
		}),
		soundMeterPort: SketchPortSchema.optional().meta({
			description: 'Digital port the sound level meter sensor is connected to.',
			example: 'B',
		}),
		windSpeedPort: SketchPortSchema.optional().meta({
			description: 'Digital port the wind speed sensor is connected to.',
			example: 'C',
		}),
		ssid: z.string().optional().meta({
			description: 'SSID of the Wi-Fi network.',
			example: 'MyWiFi',
		}),
		password: z.string().optional().meta({
			description: 'Password of the Wi-Fi network.',
			example: 'super-secret-password',
			format: 'password',
		}),
		devEUI: z.string().optional().meta({
			description: 'devEUI of the TTN device.',
			example: '70B3D57ED0000000',
		}),
		appEUI: z.string().optional().meta({
			description: 'appEUI of the TTN application.',
			example: '70B3D57ED0000000',
		}),
		appKey: z.string().optional().meta({
			description: 'appKey of the TTN application.',
			example: '00000000000000000000000000000000',
		}),
		display_enabled: z.enum(['true', 'false']).optional().meta({
			description: 'Whether to include code for an attached OLED display.',
			example: 'true',
		}),
	})
	.meta({
		id: 'SketchOptions',
		description:
			'Optional sketch generation parameters. For GET requests these are passed as query parameters; for POST requests they are passed as form fields.',
	})

export type SketchOptions = z.infer<typeof SketchOptionsSchema>
