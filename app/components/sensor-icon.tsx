import { Activity, ThermometerIcon, Volume1Icon } from 'lucide-react'
import { getSensorIcon } from '~/lib/sensoricons'

interface SensorIconProps {
	title: string
	icon?: string | null
	className: string | undefined
}

export default function SensorIcon(props: SensorIconProps) {
	if (props.icon) {
		const Icon = getSensorIcon(props.icon)

		return <Icon className={props.className} />
	}

	switch (props.title.toLowerCase()) {
		case 'temperatur':
			return <ThermometerIcon className={props.className} />
		case 'lautstärke':
			return <Volume1Icon className={props.className} />
		default:
			return <Activity className={props.className} />
	}
}
