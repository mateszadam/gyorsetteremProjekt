import fs from 'fs';
import { Request } from 'express';
import { language } from 'googleapis/build/src/apis/language';

class languageBasedErrorMessage {
	private static readonly errorMessages = JSON.parse(
		fs.readFileSync('./src/languages/lang.json', 'utf8')
	);
	static getError(req: Request, errorCode: string, value: string = '') {
		let message: string;

		const lang = req.headers['accept-language'];

		if (lang && ['hu', 'en-GB'].includes(lang)) {
			message = this.errorMessages[lang][0][errorCode];
		} else {
			message = this.errorMessages['en-GB'][0][errorCode];
		}
		if (!message) {
			message = this.errorMessages['en-GB'][0]['00'];
		}
		console.log(message);
		return message.replace('{value}', value);
	}
}

export default languageBasedErrorMessage;
