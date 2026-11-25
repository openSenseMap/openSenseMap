import { createIntl } from '@formatjs/intl'
import {
	Html,
	Head,
	Body,
	Link,
	Preview,
	Container,
	Text,
	Heading,
} from 'react-email'

const messages = {
	en: {
		preview: 'Your password reset',
		heading: 'Your password reset',
		hello: 'Hi',
		description:
			'Someone has requested a link to change your password. You can do this by clicking the link below.',
		link: 'Reset password',
		hint: 'If you are unable to click the link, you can also open this address with your web browser:',
		valid: 'This link is valid for 12 hours.',
		ignore: "If you didn't request this, please ignore this email.",
		warn: "Your password won't change until you access the link above and create a new one.",
		support: 'If you have any questions, feel free to write us an email to:',
		salutation: 'Best wishes your openSenseMap Team',
	},
	de: {
		preview: 'Zurücksetzen deines Passworts',
		heading: 'Zurücksetzen deines Passworts',
		hello: 'Hallo',
		description:
			'Jemand hat ein Zurücksetzen deines Passworts angefordert. Du kannst dein Passwort zurücksetzen, indem du auf den Link unten klickst.',
		link: 'Passwort zurücksetzen',
		hint: 'Wenn sich der Link nicht anklicken lässt, kannst du auch diese Adresse kopieren und mit deinem Browser öffnen:',
		valid: 'Dieser Link ist insgesamt 12 Stunden gültig.',
		ignore:
			'Falls du kein neues Passwort angefordert hast, ignoriere diese E-Mail.',
		warn: 'Dein Passwort wird sich nicht änden bevor du auf den Link geklickt hast und dort ein neues vergeben hast.',
		support: 'Wenn Du Fragen hast schreib uns eine Mail an:',
		salutation: 'Viele Grüße, dein openSenseMap Team',
	},
}

interface User {
	name: string
	email: string
}

interface PasswordResetProps {
	user: User
	token: string
	language: 'de' | 'en'
}

const baseUrl = process.env.OSEM_URL
	? `https://${process.env.OSEM_URL}`
	: 'https://opensensemap.org'

export const PasswordResetEmail = ({
	user = { name: 'Max Mustermann', email: 'max.mustermann@example.com' },
	token = '1234-5678-9012',
	language = 'en',
}: PasswordResetProps) => {
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
					<Link href={`${baseUrl}/account/password-reset?token=${token}`}>
						{intl.formatMessage({ id: 'link' })}
					</Link>
					<Text>{intl.formatMessage({ id: 'hint' })}</Text>
					<code
						style={code}
					>{`${baseUrl}/account/password-reset?token=${token}`}</code>
					<Text
						style={{
							...text,
							color: '#ababab',
							marginTop: '14px',
							marginBottom: '16px',
						}}
					>
						{intl.formatMessage({ id: 'valid' })}
					</Text>
					<Text>{intl.formatMessage({ id: 'ignore' })}</Text>
					<Text>{intl.formatMessage({ id: 'warn' })}</Text>
					<Text>
						{intl.formatMessage({ id: 'support' })} {}
						<Link
							href={`mailto:info@opensensemap.org?Subject=Password%20Zur%C3%BCcksetzen%20f%C3%BCr%20${encodeURIComponent(
								user.email,
							)}`}
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

export default PasswordResetEmail

export const subject = {
	de: 'Zurücksetzen deines Passworts',
	en: 'Your password reset',
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
