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
		preview: 'Confirm your openSenseMap info mails subscription',
		heading: 'Confirm info mails subscription',
		hello: 'Hi',
		description:
			'Please confirm that you want to receive openSenseMap info mails by clicking the link below.',
		link: 'Confirm info mails subscription',
		hint: 'If you are unable to click the link, you can also open this address with your web browser:',
		valid: 'This link is valid for 7 days.',
		ignore: "If you didn't request this, please ignore this email.",
		support: 'If you have any questions, feel free to write us an email to:',
		salutation: 'Best wishes your openSenseMap Team',
	},
	de: {
		preview: 'Bestätige dein openSenseMap Info-Mails-Abonnement',
		heading: 'Info-Mails-Abonnement bestätigen',
		hello: 'Hallo',
		description:
			'Bitte bestätige, dass du die openSenseMap Info-Mails erhalten möchtest, indem du auf den folgenden Link klickst.',
		link: 'Info-Mails-Abonnement bestätigen',
		hint: 'Wenn sich der Link nicht anklicken lässt, kannst du auch diese Adresse kopieren und mit deinem Browser öffnen:',
		valid: 'Dieser Link ist 7 Tage gültig.',
		ignore:
			'Falls du die Info-Mails nicht angefordert hast, ignoriere diese E-Mail.',
		support: 'Wenn du Fragen hast, schreib uns eine Mail an:',
		salutation: 'Viele Grüße, dein openSenseMap Team',
	},
}

interface NewsletterConfirmationEmailProps {
	user: {
		name: string
		email: string
	}
	token: string
	language: 'de' | 'en'
}

const baseUrl = process.env.OSEM_URL
	? `https://${process.env.OSEM_URL}`
	: 'https://opensensemap.org'

export const NewsletterConfirmationEmail = ({
	user = { name: 'Max Mustermann', email: 'max.mustermann@example.com' },
	token = '1234-5678-9012',
	language = 'en',
}: NewsletterConfirmationEmailProps) => {
	const intl = createIntl({
		locale: language,
		messages: messages[language],
	})
	const confirmationUrl = `${baseUrl}/account/confirm-newsletter?token=${token}`

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
					<Link href={confirmationUrl}>
						{intl.formatMessage({ id: 'link' })}
					</Link>
					<Text>{intl.formatMessage({ id: 'hint' })}</Text>
					<code style={code}>{confirmationUrl}</code>
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
					<Text>
						{intl.formatMessage({ id: 'support' })} {}
						<Link
							href={`mailto:info@opensensemap.org?Subject=Info-Mails%20Best%C3%A4tigung%20f%C3%BCr%20${encodeURIComponent(
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

export default NewsletterConfirmationEmail

export const subject = {
	de: 'Bestätige dein openSenseMap Info-Mails-Abonnement',
	en: 'Confirm your openSenseMap info mails subscription',
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
