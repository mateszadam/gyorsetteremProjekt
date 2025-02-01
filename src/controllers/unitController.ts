import { Router, Request, Response } from 'express';
import { getRawId, IController, User } from '../models/models';
import { unitOfMeasureModel, userModel } from '../models/mongooseSchema';
import {
	authenticateAdminToken,
	generateToken,
	isAuthValid,
} from '../services/tokenService';
import { log } from 'console';
import { defaultAnswers } from '../helpers/statusCodeHelper';

export default class unitController implements IController {
	public router = Router();
	private unit = unitOfMeasureModel;
	public endPoint = '/unit';

	constructor() {
		this.router.get('/add', authenticateAdminToken, this.add);
	}

	/**
	 * @swagger
	 * /unit/add:
	 *   get:
	 *     summary: Add a new unit of measure
	 *     tags: [Units]
	 *     security:
	 *       - bearerAuth: []
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             required:
	 *               - name
	 *             properties:
	 *               name:
	 *                 type: string
	 *                 description: Name of the unit of measure
	 *     responses:
	 *       200:
	 *         description: Unit successfully added
	 *       400:
	 *         description: Bad request
	 *       401:
	 *         description: Unauthorized
	 */
	private add = async (req: Request, res: Response) => {
		try {
			const newUnit = req.body;
			if (newUnit) {
				const response = await this.unit.insertMany([newUnit]);
				if (response) {
					defaultAnswers.ok(res);
				} else {
					throw Error('Failed to insert database');
				}
			} else {
				throw Error('No body found');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
}
