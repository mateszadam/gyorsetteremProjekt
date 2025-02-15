import morgan from 'morgan';
import languageBasedErrorMessage from './languageHelper';
import express from 'express';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
export default class ImplementMiddleware {
	public static init(app: express.Application) {
		app.use(express.json());
		app.use(cors());
		app.use(morgan('dev'));
		const limiter = rateLimit({
			windowMs: 15 * 60 * 1000,
			limit: 100,
			standardHeaders: 'draft-8',
			legacyHeaders: false,
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
