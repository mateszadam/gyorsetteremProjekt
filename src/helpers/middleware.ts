import { Request, Response, NextFunction } from 'express';
import defaultAnswers from './statusCodeHelper';

const jsonValidator = function (
	req: Request,
	res: Response,
	next: NextFunction
) {
	console.log(req.path);

	console.log('4');
	let allowedRoutes = [
		'/',
		'/swagger-ui.css',
		'/swagger-ui-bundle.js',
		'/swagger-ui-standalone-preset.js',
		'/swagger-ui-init.js',
		'/favicon-32x32.png',
		'/favicon-16x16.png',
		'/favicon.ico',
	];
	try {
		if (!allowedRoutes.includes(req.path)) {
			console.log('1');

			const data = JSON.stringify(req.body);

			if (!data) {
				throw Error();
			}
		}
		next();
	} catch (e: any) {
		defaultAnswers.badRequest(res, 'Not valid json!');
	}
};

export { jsonValidator };
