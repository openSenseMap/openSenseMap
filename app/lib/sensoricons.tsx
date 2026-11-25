import {
	Activity,
	Atom,
	Battery,
	CircleGauge,
	Clock,
	Cloud,
	CloudRain,
	Droplets,
	Flame,
	Gauge,
	Mic,
	Radiation,
	Sprout,
	SunMoon,
	Thermometer,
	Umbrella,
	Volume2,
	Wifi,
	Wind,
	Zap,
	type LucideIcon,
} from 'lucide-react'

const sensorIconClassName =
	'mr-1 ml-[6px] inline-block h-4 w-4 align-text-bottom text-[#818a91]'

type SensorIconOption = {
	id: string
	name: LucideIcon
}

const iconsList = [
	{ id: 'Thermometer', name: Thermometer },
	{ id: 'Droplets', name: Droplets },
	{ id: 'Cloud', name: Cloud },
	{ id: 'Gauge', name: Gauge },
	{ id: 'CircleGauge', name: CircleGauge },
	{ id: 'SunMoon', name: SunMoon },
	{ id: 'Wind', name: Wind },
	{ id: 'CloudRain', name: CloudRain },
	{ id: 'Umbrella', name: Umbrella },
	{ id: 'Volume2', name: Volume2 },
	{ id: 'Mic', name: Mic },
	{ id: 'Wifi', name: Wifi },
	{ id: 'Battery', name: Battery },
	{ id: 'Atom', name: Atom },
	{ id: 'Radiation', name: Radiation },
	{ id: 'Zap', name: Zap },
	{ id: 'Flame', name: Flame },
	{ id: 'Clock', name: Clock },
	{ id: 'Sprout', name: Sprout },
	{ id: 'Activity', name: Activity },
] satisfies SensorIconOption[]

const iconMap = Object.fromEntries(
	iconsList.map((icon) => [icon.id, icon.name]),
) as Record<string, LucideIcon>

const legacyIconAliases: Record<string, string> = {
	ThermometerIcon: 'Thermometer',
	WindIcon: 'Wind',
	Tornado: 'Wind',
	SunMoonIcon: 'SunMoon',
	MicIcon: 'Mic',
	'osem-radioactive': 'Radiation',
	'osem-particulate-matter': 'Cloud',
	'osem-moisture': 'Sprout',
	'osem-temperature-celsius': 'Thermometer',
	'osem-temperature-fahrenheit': 'Thermometer',
	'osem-drops': 'Droplets',
	'osem-thermometer': 'Thermometer',
	'osem-windspeed': 'Wind',
	'osem-sprinkles': 'CloudRain',
	'osem-brightness': 'SunMoon',
	'osem-barometer': 'Gauge',
	'osem-humidity': 'Droplets',
	'osem-not-available': 'Activity',
	'osem-gauge': 'CircleGauge',
	'osem-umbrella': 'Umbrella',
	'osem-clock': 'Clock',
	'osem-shock': 'Zap',
	'osem-fire': 'Flame',
	'osem-signal': 'Wifi',
	'osem-volume-up': 'Volume2',
	'osem-cloud': 'Cloud',
	'osem-microphone': 'Mic',
	'osem-wifi': 'Wifi',
	'osem-battery': 'Battery',
	'osem-co2': 'Atom',
}

function normalizeIconName(iconName?: string | null) {
	if (!iconName) return 'Thermometer'

	return legacyIconAliases[iconName] ?? iconName
}

function getSensorIcon(iconName?: string | null) {
	const normalizedIconName = normalizeIconName(iconName)

	return iconMap[normalizedIconName] ?? Thermometer
}

function getIcon(iconName: string) {
	const Icon = getSensorIcon(iconName)

	return <Icon className={sensorIconClassName} />
}

// args should accept null values for drafted / undefined sensors while editing
function assignIcon(sensorType?: string | null, sensorTitle?: string | null) {
	const normalizedSensorType = sensorType?.toLowerCase() ?? ''
	const normalizedSensorTitle = sensorTitle?.toLowerCase() ?? ''

	if (
		normalizedSensorTitle.includes('luftfeuchte') ||
		normalizedSensorTitle.includes('luftfeuchtigkeit') ||
		normalizedSensorTitle.includes('humidity') ||
		normalizedSensorTitle.includes('feuchte')
	) {
		return <Droplets className={sensorIconClassName} />
	}

	if (
		normalizedSensorTitle.includes('luftdruck') ||
		normalizedSensorTitle.includes('pressure') ||
		normalizedSensorType.includes('bmp') ||
		normalizedSensorType.includes('dps')
	) {
		return <Gauge className={sensorIconClassName} />
	}

	if (
		normalizedSensorTitle.includes('pm') ||
		normalizedSensorTitle.includes('particulate') ||
		normalizedSensorType.includes('pms') ||
		normalizedSensorType.includes('sds') ||
		normalizedSensorType.includes('sps')
	) {
		return <Cloud className={sensorIconClassName} />
	}

	if (
		normalizedSensorTitle.includes('co2') ||
		normalizedSensorTitle.includes('co₂') ||
		normalizedSensorType.includes('scd')
	) {
		return <Atom className={sensorIconClassName} />
	}

	if (
		normalizedSensorTitle.includes('lautstärke') ||
		normalizedSensorTitle.includes('schalldruck') ||
		normalizedSensorTitle.includes('sound') ||
		normalizedSensorType.includes('dnms') ||
		normalizedSensorType.includes('sound')
	) {
		return <Volume2 className={sensorIconClassName} />
	}

	if (
		normalizedSensorTitle.includes('uv') ||
		normalizedSensorTitle.includes('licht') ||
		normalizedSensorTitle.includes('brightness') ||
		normalizedSensorType.includes('tsl') ||
		normalizedSensorType.includes('veml')
	) {
		return <SunMoon className={sensorIconClassName} />
	}

	if (
		normalizedSensorTitle.includes('wind') ||
		normalizedSensorType.includes('wind')
	) {
		return <Wind className={sensorIconClassName} />
	}

	if (
		normalizedSensorTitle.includes('boden') ||
		normalizedSensorTitle.includes('soil')
	) {
		return <Sprout className={sensorIconClassName} />
	}

	return <Thermometer className={sensorIconClassName} />
}

export { iconsList, getSensorIcon, getIcon, assignIcon }
