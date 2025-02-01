import { Router, Request, Response } from 'express';
import { getRawId, IController, User } from '../models/models';
import { userModel } from '../models/mongooseSchema';
import {
	authenticateAdminToken,
	generateToken,
	isAuthValid,
} from '../services/tokenService';
import { log } from 'console';
import { defaultAnswers } from '../helpers/statusCodeHelper';

export default class tokenValidationController implements IController {
	public router = Router();
	private user = userModel;
	public endPoint = '/token';

	bcrypt = require('bcrypt');

	/**
	 * @openapi
	 * /token/:
	 *   get:
	 *     summary: Validate token
	 *     tags: [Token validation]
	 *     responses:
	 *       200:
	 *         description: Token is valid
	 *       400:
	 *         description: Token is invalid
	 *
	 */

	constructor() {
		// this.router.get('/admin', this.isAdminTokenValid);
		// this.router.get('/customer', this.isCustomerTokenValid);
		// this.router.get('/kitchen', this.isKitchenTokenValid);
		// this.router.get('/kiosk', this.isKioskTokenValid);
		this.router.get('/', this.isTokenValid);
	}

	private isAdminTokenValid = async (req: Request, res: Response) => {
		try {
			const token = req.headers.authorization?.replace('Bearer ', '');

			if (token && (await isAuthValid(token!, ['admin']))) {
				defaultAnswers.ok(res);
			} else {
				defaultAnswers.badRequest(res);
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
	private isTokenValid = async (req: Request, res: Response) => {
		try {
			const token = req.headers.authorization?.replace('Bearer ', '');
			if (token && (await isAuthValid(token!))) {
				defaultAnswers.ok(res);
			} else {
				defaultAnswers.badRequest(res);
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
}
