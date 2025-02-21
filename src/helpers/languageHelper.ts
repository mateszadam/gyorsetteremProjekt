import fs from 'fs';
import { Request } from 'express';

class languageBasedErrorMessage {
	private static readonly errorMessages = JSON.parse(
		fs.readFileSync('./src/languages/lang.json', 'utf8')
	);
	static getError(req: Request, errorCode: string) {
		let message: string;
		const lang = req.headers['accept-language'];

		let language = lang || 'en-GB';

		if (['hu', 'en-GB'].includes(language)) {
			message = this.errorMessages[language][0][errorCode];
		} else {
			message = this.errorMessages[language][0][errorCode];
		}
		if (!message) {
			console.log('----------------------------');
			console.log('\x1b[41m%s\x1b[0m', errorCode);
			console.log('----------------------------');
			// Custom error messages on errors
			if (errorCode.includes('E11000'))
				message = this.errorMessages[language][0][60];
			else if (errorCode.includes('Cast to ObjectId failed for value'))
				message = this.errorMessages[language][0][61];
			else {
				message = errorCode;
			}
		}
		console.log(message);

		return message;
	}
}

export default languageBasedErrorMessage;
