import { Router, Request, Response } from 'express';
import { IController } from '../models/models';
import { authenticateToken } from '../services/tokenService';
import { defaultAnswers } from '../helpers/statusCodeHelper';

export default class userController implements IController {
	public router = Router();
	public endPoint = '/websocket';

	constructor() {
		this.router.get('/user/:id', authenticateToken);
	}

	private getAll = async (req: Request, res: Response) => {
		try {
			throw Error('Not implemented');
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
}
