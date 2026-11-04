import * as dotenv from 'dotenv'
import nodemailer, { type Transporter } from 'nodemailer'
import type SMTPTransport from 'nodemailer/lib/smtp-transport'
import { render } from 'react-email'
dotenv.config()

/**
 * Interface for our configuration.
 * Note these variables can possibly be undefined,
 * as varibales may be skipped or  there is no .env file at all
 */
interface Config {
	DISABLE_MAILING: boolean
	SMTP_HOST: string | undefined
	SMTP_PORT: number | undefined
	SMTP_SECURE: boolean | undefined
	SMTP_USERNAME: string | undefined
	SMTP_PASSWORD: string | undefined
}

/**
 * Processes environment variables and
 * builds a configuration object from it.
 * @returns {Config} A mailer configuration
 */
const getConfig = (): Config => {
	const config = {
		DISABLE_MAILING: JSON.parse(process.env.DISABLE_MAILING ?? 'false'),
		SMTP_HOST: process.env.SMTP_HOST,
		SMTP_PORT: process.env.SMTP_PORT
			? Number(process.env.SMTP_PORT)
			: undefined,
		SMTP_SECURE: process.env.SMTP_SECURE
			? Boolean(JSON.parse(process.env.SMTP_SECURE))
			: undefined,
		SMTP_USERNAME: process.env.SMTP_USERNAME,
		SMTP_PASSWORD: process.env.SMTP_PASSWORD,
	}

	// check the config for missing entries and throw an error if necessary
	for (const [key, value] of Object.entries(config)) {
		if (value === undefined) {
			throw new Error(`Missing key ${key} in config.env`)
		}
	}

	return config
}

const config = getConfig()

class OSEMTransporter {
	private static _instance: Transporter | null = null
	private constructor() {}
	public static async getInstance(): Promise<Transporter> {
		if (this._instance !== null) return this._instance

		if (process.env.TEST) {
			return await new Promise((resolve, reject) => {
				nodemailer.createTestAccount((err, account) => {
					if (err) reject(err)
					else {
						this._instance = nodemailer.createTransport({
							host: 'smtp.ethereal.email',
							port: 587,
							secure: false,
							auth: {
								user: account.user,
								pass: account.pass,
							},
						})
						resolve(this._instance)
					}
				})
			})
		} else {
			const transportOptions: SMTPTransport.Options = {
				host: config.SMTP_HOST,
				port: config.SMTP_PORT,
				secure: config.SMTP_SECURE,
			}
			if (
				config.SMTP_USERNAME !== 'ignored' &&
				config.SMTP_PASSWORD !== 'ignored'
			) {
				transportOptions['auth'] = {
					user: config.SMTP_USERNAME,
					pass: config.SMTP_PASSWORD,
				}
			}
			this._instance = nodemailer.createTransport(transportOptions)
			return this._instance
		}
	}
}

if (!config.DISABLE_MAILING) void OSEMTransporter.getInstance() // eagerly initialize the transporter

export interface MailAttachment {
	filename: string
	content: string
}

export const sendMail = async (mailConfig: {
	recipientAddress: string
	recipientName?: string
	subject?: string
	body: React.ReactElement
	attachments?: MailAttachment[]
}) => {
	if (config.DISABLE_MAILING) return

	try {
		const mailHtml = await render(mailConfig.body)

		await (
			await OSEMTransporter.getInstance()
		).sendMail({
			from: '"openSenseMap 🌍" <no-reply@opensensemap.org>',
			to: mailConfig.recipientName
				? `"${mailConfig.recipientName}" <${mailConfig.recipientAddress}>`
				: mailConfig.recipientAddress,
			subject: mailConfig.subject ?? 'openSenseMap',
			html: mailHtml,
			attachments: mailConfig.attachments,
		})
	} catch (err) {
		console.error(err)
		throw err
	}
}
