import { Router, Request, Response } from 'express';
import { IController, IUnit } from '../models/models';
import { unitOfMeasureModel } from '../models/mongooseSchema';
import { authAdminToken } from '../services/tokenService';
import defaultAnswers from '../helpers/statusCodeHelper';

import Joi from 'joi';

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
				res.status(400).json(validation);
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
		materialName: Joi.string().min(1).max(30).required().messages({
			'any.required': '^A név megadása kötelező.',
			'string.empty': '^A név megadása kötelező.',
			'string.min': '^A név hossza 1 és 30 karakter között kell legyen.',
			'string.max': '^A név hossza 1 és 30 karakter között kell legyen.',
		}),
		unit: Joi.string().required().messages({
			'any.required': '^A mértékegység megadása kötelező.',
			'string.empty': '^A mértékegység megadása kötelező.',
		}),
	});
}
