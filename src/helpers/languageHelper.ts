import fs from 'fs';
import { Request } from 'express';
import {
	ICategory,
	IFood,
	IMaterial,
	IMaterialChange,
	IOrderFull,
} from '../models/models';

class languageBasedMessage {
	private static readonly errorMessages = JSON.parse(
		fs.readFileSync('./src/languages/lang.json', 'utf8')
	);
	static getError(req: Request, errorCode: string) {
		try {
			let message: string;
			const lang = req.headers['accept-language'];

			let language = lang || 'en-GB';

			if (['hu', 'en-GB'].includes(language)) {
				message = this.errorMessages[language][0][errorCode];
			} else {
				message = this.errorMessages['en-GB'][0][errorCode];
			}
			if (!message) {
				console.log('----------------------------');
				console.log('\x1b[43m%s\x1b[0m', errorCode);
				console.log('----------------------------');
				// Custom error messages on errors
				if (errorCode.includes('E11000'))
					message = this.errorMessages[language][0][60];
				else if (errorCode.includes('Cast to ObjectId failed for value'))
					message = this.errorMessages[language][0][61];
				else if (errorCode.includes("BSON field 'skip' value must be >= 0"))
					message = this.errorMessages[language][0][88];
				else {
					message = errorCode;
				}
			}

			return message;
		} catch (err) {
			console.log(err);
			return 'Internal Server Error';
		}
	}
	static getLangageBasedName(
		req: Request,
		body: ICategory[] | IFood[] | IMaterial[]
	) {
		const lang = req.headers['accept-language'];

		if (lang === 'hu') {
			body.forEach((element) => {
				delete element.englishName;
			});
			return body;
		} else {
			body.forEach((element) => {
				if (element.englishName) element.name = element.englishName;

				delete element.englishName;
			});
			return body;
		}
	}
	static getLangageBasedNameFormOrder(req: Request, body: IOrderFull[]) {
		const lang = req.headers['accept-language'];

		if (lang === 'hu') {
			body.forEach((element) => {
				element.orderedProducts.forEach((food) => {
					if (food.details) delete food.details.englishName;
				});
			});
			return body;
		} else {
			body.forEach((element) => {
				element.orderedProducts.forEach((food) => {
					if (food.details) {
						if (food.details.englishName)
							food.details.name = food.details.englishName;
						delete food.details.englishName;
					}
				});
			});
			return body;
		}
	}
}
export default languageBasedMessage;
