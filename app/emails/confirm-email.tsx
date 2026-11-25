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
		preview: 'openSenseMap E-Mail address confirmation',
		heading: 'Confirm your E-Mail address',
		hello: 'Hi',
		description:
			'Someone has requested to change your email address. You can do this by clicking the link below.',
		link: 'Confirm email address',
		hint: 'If you are unable to click the link, you can also open this address with your web browser:',
		warn: "If you didn't request this, please ignore this email.",
		support: 'If you have any questions, feel free to write us an email to:',
		salutation: 'Best wishes, your openSenseMap Team',
	},
	de: {
		preview: 'openSenseMap Bestätigung deiner E-Mailadresse',
		heading: 'Bestätigung deiner E-Mailadresse',
		hello: 'Hallo',
		description:
			'Jemand hat eine Änderung deiner E-Mail Adresse angefordert. Dies kannst du tun, indem du auf den Link unten klickst.',
		link: 'E-Mail bestätigen',
		hint: 'Wenn sich der Link nicht anklicken lässt, kannst du auch diese Adresse kopieren und mit deinem Browser öffnen:',
		warn: 'Falls du keine Änderung deiner E-Mail Adresse angefordert hast, ignoriere diese E-Mail.',
		support: 'Wenn Du Fragen hast schreib uns eine Mail an:',
		salutation: 'Viele Grüße, dein openSenseMap Team',
	},
}

interface User {
	name: string
}

interface ConfirmEmailAddressProps {
	user: User
	token: string
	email: string
	language: 'de' | 'en'
}

const baseUrl = process.env.OSEM_URL
	? `https://${process.env.OSEM_URL}`
	: 'https://opensensemap.org'

export const ConfirmEmailAddress = ({
	user = { name: 'Max Mustermann' },
	token = '1234-5678-9010',
	email = 'max.mustermann@example.com',
	language = 'en',
}: ConfirmEmailAddressProps) => {
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
					<Link
						href={`${baseUrl}/account/confirm-email?token=${token})}`}
						target="_blank"
						style={{
							...link,
							display: 'block',
							marginBottom: '16px',
						}}
					>
						{intl.formatMessage({ id: 'link' })}
					</Link>
					<Text style={{ ...text, marginBottom: '14px' }}>
						{intl.formatMessage({ id: 'hint' })}
					</Text>
					<code
						style={code}
					>{`${baseUrl}/account/confirm-email?token=${token})}`}</code>
					<Text
						style={{
							...text,
							color: '#ababab',
							marginTop: '14px',
							marginBottom: '16px',
						}}
					>
						{intl.formatMessage({ id: 'warn' })}
					</Text>
					<Text
						style={{
							...text,
							color: '#ababab',
							marginTop: '12px',
							marginBottom: '38px',
						}}
					>
						{intl.formatMessage({ id: 'support' })} {}
						<Link
							href={`mailto:info@opensensemap.org?Subject=Email%20Best%C3%A4tigen%20f%C3%BCr%20${encodeURI(email)}`}
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

export default ConfirmEmailAddress

export const subject = {
	de: 'Bestätigung deiner E-Mailadresse',
	en: 'openSenseMap E-Mail address confirmation',
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
