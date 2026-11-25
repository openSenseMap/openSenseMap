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
		preview: 'Your openSenseMap account has been deleted',
		heading: 'openSenseMap account has been deleted',
		hello: 'Dear',
		description:
			'Your account and all registered devices are being deleted. Sad to see you go!',
		hint: 'This action is irreversible. If you want to participate again, register yourself a new account at',
		hint_suffix: '.',
		support: 'If you have any questions, feel free to write us an email to:',
		salutation: 'Best wishes, your openSenseMap Team',
	},
	de: {
		preview: 'Dein openSenseMap Account wurde gelöscht',
		heading: 'openSenseMap Account wurde gelöschen',
		hello: 'Hallo',
		description:
			'Dein Account und alle deine Geräte wurden gerade gelöscht. Schade, dass du dich gelöscht hast!',
		hint: 'Dieser Vorgang ist endgültig. Wenn du gerne wieder teilnehmen möchtest, kannst du dich einfach auf',
		hint_suffix: 'neu registrieren.',
		support: 'Wenn Du Fragen hast schreib uns eine Mail an:',
		salutation: 'Tschüss, dein openSenseMap Team',
	},
}

interface User {
	name: string
}

interface DeleteUserEmailProps {
	user: User
	language: 'de' | 'en'
}

const baseUrl = process.env.OSEM_URL
	? `https://${process.env.OSEM_URL}`
	: 'https://opensensemap.org'

export const DeleteUserEmail = ({
	user = { name: 'Max Mustermann' },
	language = 'en',
}: DeleteUserEmailProps) => {
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
					<Text>
						{intl.formatMessage({ id: 'hint' })}{' '}
						<Link href={baseUrl} target="_blank">
							opensensemap.org
						</Link>{' '}
						{intl.formatMessage({ id: 'hint_suffix' })}
					</Text>
					<Text>
						{intl.formatMessage({ id: 'support' })} {}
						<Link href="mailto:info@opensensemap.org">
							info@opensensemap.org
						</Link>
					</Text>
					<Text>{intl.formatMessage({ id: 'salutation' })}</Text>
				</Container>
			</Body>
		</Html>
	)
}

export default DeleteUserEmail

export const subject = {
	de: 'Dein Account wurde gelöscht',
	en: 'Your openSenseMap account has been deleted',
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
