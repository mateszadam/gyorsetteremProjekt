import { Router, Request, Response } from 'express';
import { getRawId, IController, User } from '../models/models';
import { userModel } from '../models/mongooseSchema';
import {
	authenticateAdminToken,
	authenticateToken,
	generateToken,
	isAuthValid,
} from '../services/tokenService';
import { log } from 'console';
import { defaultAnswers } from '../helpers/statusCodeHelper';

export default class userController implements IController {
	public router = Router();
	public endPoint = '/websocket';

	constructor() {
		this.router.get('/user/:id', authenticateToken);
	}

	private getAll = async (req: Request, res: Response) => {
		try {
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
}
