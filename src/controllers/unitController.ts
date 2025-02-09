import { Router, Request, Response } from 'express';
import { IController, IUnit } from '../models/models';
import { unitOfMeasureModel } from '../models/mongooseSchema';
import { authAdminToken } from '../services/tokenService';
import { defaultAnswers } from '../helpers/statusCodeHelper';
import validate from 'validate.js';

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
			const validation = validate(newUnit, this.unitConstraints);
			if (!validation) {
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
	private unitConstraints = {
		materialName: {
			presence: {
				allowEmpty: false,
				message: '^A név megadása kötelező.',
			},
			length: {
				minimum: 1,
				maximum: 50,
				message: '^A név hossza 1 és 30 karakter között kell legyen.',
			},
		},
		unit: {
			presence: {
				allowEmpty: false,
				message: '^A mértékegység megadása kötelező.',
			},
		},
	};
}
