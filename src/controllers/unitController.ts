import { Router, Request, Response } from 'express';
import { IController, IUnit } from '../models/models';
import { unitOfMeasureModel } from '../models/mongooseSchema';
import { authAdminToken } from '../services/tokenService';
import defaultAnswers from '../helpers/statusCodeHelper';

import Joi from 'joi';
import languageBasedErrorMessage from '../helpers/laguageHelper';

export default class unitController implements IController {
	public router = Router();
	private unit = unitOfMeasureModel;
	public endPoint = '/unit';

	constructor() {
		this.router.post('/add', authAdminToken, this.add);
		this.router.get('/all', authAdminToken, this.getAll);
	}

	private add = async (req: Request, res: Response) => {
		try {
			const newUnit: IUnit = req.body;
			const validation = await this.unitConstraints.validateAsync(newUnit);
			if (validation) {
				const response = await this.unit.insertMany([newUnit]);
				if (response) {
					defaultAnswers.ok(res);
				} else {
					throw Error('Failed to insert database');
				}
			} else {
				res
					.status(400)
					.json(languageBasedErrorMessage.getError(req, validation.message));
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
	private unitConstraints = Joi.object({
		materialName: Joi.string().min(3).max(30).required().messages({
			'any.required': '17',
			'string.empty': '17',
			'string.min': '18',
			'string.max': '17',
		}),
		unit: Joi.string().required().messages({
			'any.required': '32',
			'string.empty': '32',
		}),
	});
}
