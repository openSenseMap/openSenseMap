import { createIntl } from '@formatjs/intl'
import {
	Body,
	Container,
	Head,
	Heading,
	Html,
	Link,
	Preview,
	Text,
} from 'react-email'

const messages = {
	en: {
		preview: 'Your new Sketch',
		heading: 'Your new Sketch',
		hello: 'Hi',
		description:
			"you've just changed your model or sensors of your weatherstation on the openSenseMap. You will find the new sketch in the attachment of this mail.",
		attention: 'Attention!',
		warn: 'The sketch in the attachment is in an untreated state. This means:',
		warn1:
			'Your network settings like wifi or ethernet configurations have to be taken over from your old sketch.',
		warn2:
			"Every change you've made to include other sensors have to be taken over from your old sketch.",
		warn3: "The sketch does not contain other changes you've made!",
		sensors:
			'In addition, the following IDs were generated for the sensors of your station:',
		deviceId: 'Your senseBox ID is:',
		support: 'If you have any questions write us an email to:',
		salutation:
			'The openSenseMap team wishes you a lot of fun with your new senseBox',
	},
	de: {
		preview: 'Dein neuer Sketch',
		heading: 'Dein neuer Sketch',
		hello: 'Hallo',
		description:
			'du hast gerade das Modell oder die Sensoren deiner Wetterstation auf der openSenseMap geändert. Deswegen schicken wir dir hier einen aktualisierten Arduino-Sketch, den du im Anhang findest.',
		attention: 'Achtung!',
		warn: 'Der Sketch im Anhang befindet sich im Rohzustand. Das bedeutet:',
		warn1:
			'Netzwerkeinstellungen für Wifi oder statische Ethernetkonfigurationen müssen vom alten Sketch übernommen werden.',
		warn2:
			'Jegliche Änderungen für zum Beispiel: andere Sensoren müssen vom alten Sketch übernommen werden.',
		warn3: 'Jede andere Änderung ist nicht enthalten!',
		sensors:
			'Außerdem wurden die folgenden IDs für die Sensoren deiner Station generiert:',
		deviceId: 'Deine senseBox-ID lautet:',
		support: 'Wenn Du Fragen hast schreib uns eine Mail an:',
		salutation: 'Viel Spaß wünscht dein openSenseMap Team',
	},
}

interface User {
	name: string
}

interface Sensor {
	_id: string
	title: string
	sensorType: string
}

interface Device {
	_id: string
	name: string
	sensors: Sensor[]
}

interface NewSketchProps {
	user: User
	device: Device
	language: 'de' | 'en'
}

const baseUrl = process.env.OSEM_URL
	? `https://${process.env.OSEM_URL}`
	: 'https://opensensemap.org'

export const NewSketchEmail = ({
	user = { name: 'Max Mustermann' },
	device = {
		_id: '1234567890',
		name: 'senseBox Test Gerät',
		sensors: [
			{ _id: '9876543210', title: 'Temperatur', sensorType: 'HDC1080' },
		],
	},
	language = 'en',
}: NewSketchProps) => {
	const intl = createIntl({
		locale: language,
		messages: messages[language],
	})

	return (
		<Html lang={language} dir="ltr">
			<Head />
			<Preview>{intl.formatMessage({ id: 'preview' })}</Preview>
			<Body style={main}>
				<Container style={container}>
					<Heading style={h1}>{intl.formatMessage({ id: 'heading' })}</Heading>
					<Text>
						{intl.formatMessage({ id: 'hello' })} {user.name},
					</Text>
					<Text>{intl.formatMessage({ id: 'description' })}</Text>
					<Heading as="h4">{intl.formatMessage({ id: 'attention' })}</Heading>
					<Text>{intl.formatMessage({ id: 'warn' })}</Text>
					<ul>
						<li key="warn1">{intl.formatMessage({ id: 'warn1' })}</li>
						<li key="warn2">{intl.formatMessage({ id: 'warn2' })}</li>
						<li key="warn3">{intl.formatMessage({ id: 'warn3' })}</li>
					</ul>
					<Text>
						{intl.formatMessage({ id: 'deviceId' })} <b>{device._id}</b>
					</Text>
					<Text>{intl.formatMessage({ id: 'sensors' })}</Text>
					<ul>
						{device.sensors.map((sensor) => (
							<li key={sensor._id}>
								{sensor.title} ({sensor.sensorType}): {sensor._id}
							</li>
						))}
					</ul>
					<Text>
						{intl.formatMessage({ id: 'support' })} {}
						<Link
							href={`mailto:info@opensensemap.org?Subject=Neuer%20Sketch%20Box-Id%20${device._id}`}
						>
							info@opensensemap.org
						</Link>
					</Text>
					<Text>{intl.formatMessage({ id: 'salutation' })}</Text>
				</Container>
			</Body>
		</Html>
	)
}

export default NewSketchEmail

export const subject = {
	de: 'Dein neuer Sketch',
	en: 'Your new Sketch',
}

const main = {
	backgroundColor: '#ffffff',
}

const container = {
	paddingLeft: '12px',
	paddingRight: '12px',
	margin: '0 auto',
}

const h1 = {
	color: '#333',
	fontFamily:
		"-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
	fontSize: '24px',
	fontWeight: 'bold',
	margin: '40px 0',
	padding: '0',
}

const link = {
	color: '#2754C5',
	fontFamily:
		"-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
	fontSize: '14px',
	textDecoration: 'underline',
}

const text = {
	color: '#333',
	fontFamily:
		"-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
	fontSize: '14px',
	margin: '24px 0',
}

const code = {
	display: 'inline-block',
	padding: '16px 4.5%',
	width: '90.5%',
	backgroundColor: '#f4f4f4',
	borderRadius: '5px',
	border: '1px solid #eee',
	color: '#333',
}
