import { Request, Response, NextFunction } from 'express';
import defaultAnswers from './statusCodeHelper';

const jsonValidator = function (
	req: Request,
	res: Response,
	next: NextFunction
) {
	console.log('4');

	try {
		console.log('1');

		const data = JSON.parse(req.body);
		console.log('2');

		if (data) {
			throw Error();
		}
		next();
	} catch (err: any) {
		defaultAnswers.badRequest(res, 'Not valid json!');
	}
};

export { jsonValidator };
