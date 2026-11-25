import { messages as baseMessages } from './base-new-device'

export const messages = {
	...baseMessages,
	en: {
		...baseMessages.en,
		mainText:
			'your senseBox { deviceName } is now registered at openSenseMap! 🎉 Thank you very much for contributing!',
		attachment:
			'If you have registered a senseBox with WiFi-Bee make sure you set your WiFi credentials in the arduino sketch, so your senseBox can connect to the internet. You can find further instructions ',
		attachmentLink:
			'https://docs.sensebox.de/docs/products/home/aufbau/home-schritt-3',
		attachmentLinkText: 'here ',
		attachmentSuffix: 'in the documentation.',
	},
	de: {
		...baseMessages.de,
		mainText:
			'deine senseBox mit dem Namen { deviceName } ist nun auf der openSenseMap angemeldet! 🎉 Vielen lieben Dank, dass du dich am Projekt beteiligst.',
		attachment:
			'Falls du eine senseBox mit WiFi-Bee registriert hast, denke unbedingt daran dein WiFi-Netzwerknamen und das Passwort in den Arduino Sktech einzufügen, damit sich deine senseBox mit dem Internet verbinden kann. Eine Anleitung wie es damit weitergeht, findest du ',
		attachmentLink:
			'https://docs.sensebox.de/docs/products/home/aufbau/home-schritt-3',
		attachmentLinkText: 'hier ',
		attachmentSuffix: 'in der Dokumentation.',
	},
}
