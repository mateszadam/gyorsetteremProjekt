import morgan from 'morgan';
import languageBasedErrorMessage from './languageHelper';
import express from 'express';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { log } from 'console';
const nocache = require('nocache');

export default class ImplementMiddleware {
	public static init(app: express.Application) {
		app.use(express.json());
		app.use(cors());
		app.use(morgan('dev'));
		app.use(nocache());
		const limiter = rateLimit({
			windowMs: 15 * 60 * 1000,
			limit: 200,
			standardHeaders: 'draft-8',
			legacyHeaders: false,

			message: 'To many requests, please try again later',
			skip: (req, res) => {
				if (req.ip == '::1') {
					return true;
				}
				if (req.path.includes('dashboard')) {
					return true;
				}
				return false;
			},
		});
		app.use(limiter);

		app.use(this.jsonErrorHandler);
		// TODO: Implement helmet
	}

	private static jsonErrorHandler = (
		err: any,
		req: any,
		res: any,
		next: any
	) => {
		if ((err.type = 'entity.parse.failed')) {
			const message = languageBasedErrorMessage.getError(req, '01');
			res.status(500).send({ message: message });
		}
	};
}
