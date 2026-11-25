import { messages as baseMessages } from './base-new-device'

export const messages = {
	...baseMessages,
	en: {
		...baseMessages.en,
		mainText:
			'Thank you for registering your particulate matter sensosr "{ deviceName }" on openSenseMap!',
		attachment:
			"🎉 Now, you have to configure your device in order to submit measurements to the openSenseMap. You'll find instructions to do so on ",
		attachmentLink:
			'https://tutorials.opensensemap.org/devices/devices-luftdaten/',
		attachmentLinkText:
			'https://tutorials.opensensemap.org/devices/devices-luftdaten/',
		attachmentSuffix: '',
	},
	de: {
		...baseMessages.de,
		mainText:
			'vielen Dank für die Registrierung deines Feinstaubsensors { deviceName } auf der openSenseMap!',
		attachment:
			'🎉 Damit deine Daten auch die openSenseMap erreichen, musst du noch deinen Feinstaubsensor konfigurieren. Eine Anleitung findest du unter ',
		attachmentLink:
			'https://tutorials.opensensemap.org/devices/devices-luftdaten/',
		attachmentLinkText:
			'https://tutorials.opensensemap.org/devices/devices-luftdaten/',
		attachmentSuffix: '',
	},
}
