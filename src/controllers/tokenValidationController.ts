import { Router, Request, Response } from 'express';
import { defaultAnswers, getRawId, IController, User } from '../models/models';
import { userModel } from '../models/mongooseSchema';
import {
	authenticateAdminToken,
	generateToken,
	isAuthValid,
} from '../services/tokenService';
import { log } from 'console';

export default class tokenValidationController implements IController {
	public router = Router();
	private user = userModel;
	public endPoint = '/token';

	bcrypt = require('bcrypt');

	/**
	 * @openapi
	 * /token/admin:
	 *   get:
	 *     summary: Validate admin token
	 *     tags: [Token validation]
	 *     responses:
	 *       200:
	 *         description: Token is valid
	 *       400:
	 *         description: Token is invalid
	 *
	 * /token/customer:
	 *   get:
	 *     summary: Validate customer token
	 *     tags: [Token validation]
	 *     responses:
	 *       200:
	 *         description: Token is valid
	 *       400:
	 *         description: Token is invalid
	 *
	 * /token/kitchen:
	 *   get:
	 *     summary: Validate kitchen token
	 *     tags: [Token validation]
	 *     responses:
	 *       200:
	 *         description: Token is valid
	 *       400:
	 *         description: Token is invalid
	 *
	 * /token/kiosk:
	 *   get:
	 *     summary: Validate kitchen token
	 *     tags: [Token validation]
	 *     responses:
	 *       200:
	 *         description: Token is valid
	 *       400:
	 *         description: Token is invalid
	 */
	constructor() {
		this.router.get('/admin', this.isAdminTokenValid);

		this.router.get('/customer', this.isCustomerTokenValid);

		this.router.get('/kitchen', this.isKitchenTokenValid);
		this.router.get('/kiosk', this.isKioskTokenValid);
	}

	private isAdminTokenValid = async (req: Request, res: Response) => {
		try {
			const token = req.headers.authorization?.replace('Bearer ', '');

			if (token || (await isAuthValid(token!, ['admin']))) {
				defaultAnswers.ok(res);
			} else {
				defaultAnswers.badRequest(res);
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
	private isCustomerTokenValid = async (req: Request, res: Response) => {
		try {
			const token = req.headers.authorization?.replace('Bearer ', '');

			if (token || (await isAuthValid(token!, ['customer']))) {
				defaultAnswers.ok(res);
			} else {
				defaultAnswers.badRequest(res);
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
	private isKitchenTokenValid = async (req: Request, res: Response) => {
		try {
			const token = req.headers.authorization?.replace('Bearer ', '');

			if (token || (await isAuthValid(token!, ['kitchen']))) {
				defaultAnswers.ok(res);
			} else {
				defaultAnswers.badRequest(res);
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
	private isKioskTokenValid = async (req: Request, res: Response) => {
		try {
			const token = req.headers.authorization?.replace('Bearer ', '');

			if (token || (await isAuthValid(token!, ['kiosk']))) {
				defaultAnswers.ok(res);
			} else {
				defaultAnswers.badRequest(res);
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
}
