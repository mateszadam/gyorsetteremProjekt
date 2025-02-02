import { Router, Request, Response } from 'express';
import { IController, IUnit } from '../models/models';
import { unitOfMeasureModel } from '../models/mongooseSchema';
import { authenticateAdminToken } from '../services/tokenService';
import { defaultAnswers } from '../helpers/statusCodeHelper';

/**
 * Controller for managing units of measurement
 * @class unitController
 * @implements {IController}
 *
 * @swagger
 * tags:
 *   name: Units
 *   description: API endpoints for managing units of measurement
 *
 * /unit/add:
 *   post:
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
 *               - materialName
 *               - unit
 *             properties:
 *               materialName:
 *                 type: string
 *                 description: Name of the item
 *               unit:
 *                 type: string
 *                 description: Name of the unit of measure
 *     responses:
 *       200:
 *         description: Unit successfully added
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *
 * /unit/all:
 *   get:
 *     summary: Get all units of measure
 *     tags: [Units]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all units retrieved successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
export default class unitController implements IController {
	public router = Router();
	private unit = unitOfMeasureModel;
	public endPoint = '/unit';

	constructor() {
		this.router.post('/add', authenticateAdminToken, this.add);
		this.router.get('/all', authenticateAdminToken, this.getAll);
	}

	private add = async (req: Request, res: Response) => {
		try {
			const newUnit: IUnit = req.body;
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
	private getAll = async (req: Request, res: Response) => {
		try {
			const response = await this.unit.find({}, { _id: 0 });
			if (response) {
				res.send(response);
			} else {
				throw Error('Failed to get from database');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
}
