import { Router, Request, Response } from 'express';
import { IController, IUser } from '../models/models';
import { userModel } from '../models/mongooseSchema';
import { isAuthValid } from '../services/tokenService';
import defaultAnswers from '../helpers/statusCodeHelper';
import { languageBasedMessage } from '../helpers/tools';

export default class tokenValidationController implements IController {
	public router = Router();
	private user = userModel;
	public endPoint = '/token';

	bcrypt = require('bcrypt');

	constructor() {
		this.router.get('/validate', this.isTokenValid);
	}
	private isTokenValid = async (req: Request, res: Response) => {
		try {
			const token = req.headers.authorization?.replace('Bearer ', '');
			if (token && (await isAuthValid(token!))) {
				defaultAnswers.ok(res);
			} else {
				defaultAnswers.badRequest(res);
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
			);
		}
	};
}
