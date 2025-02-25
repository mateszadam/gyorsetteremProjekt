import { Router, Request, Response } from 'express';
import { IController, IUnit } from '../models/models';
import { unitOfMeasureModel } from '../models/mongooseSchema';
import { authAdminToken } from '../services/tokenService';
import defaultAnswers from '../helpers/statusCodeHelper';

import Joi from 'joi';
import languageBasedErrorMessage from '../helpers/languageHelper';
import { log } from 'console';

export default class unitController implements IController {
	public router = Router();
	private unit = unitOfMeasureModel;
	public endPoint = '/unit';

	constructor() {
		this.router.post('/add', authAdminToken, this.add);
		this.router.get('/all', authAdminToken, this.getAll);
		this.router.delete('/delete/:name', authAdminToken, this.deleteOneByName);
		this.router.patch(
			'/update/:name',
			authAdminToken,
			this.updateByMaterialName
		);
	}

	private add = async (req: Request, res: Response) => {
		try {
			const newUnit: IUnit = req.body;
			await this.unitConstraints.validateAsync(newUnit);

			const response = await this.unit.insertMany([newUnit]);
			if (response) {
				defaultAnswers.ok(res);
			} else {
				throw Error('02');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};
	private getAll = async (req: Request, res: Response) => {
		try {
			const response = await this.unit.find({}, { _id: 0 });
			if (response) {
				res.send(response);
			} else {
				throw Error('02');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};

	private deleteOneByName = async (req: Request, res: Response) => {
		try {
			const name = req.params.name;

			if (name) {
				const response = await this.unit.deleteOne({ materialName: name });
				if (response) {
					defaultAnswers.ok(res);
				} else {
					throw Error('02');
				}
			} else {
				throw Error('42');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};

	private updateByMaterialName = async (req: Request, res: Response) => {
		try {
			const name = req.params.name;
			const newUnit = req.body;

			if (name) {
				if (newUnit.unit) {
					const response = await this.unit.updateOne(
						{ materialName: name },
						{ $set: { unit: newUnit.unit } }
					);
					if (response) {
						defaultAnswers.ok(res);
					} else {
						throw Error('02');
					}
				} else {
					throw Error('32');
				}
			} else {
				throw Error('42');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};

	private unitConstraints = Joi.object({
		materialName: Joi.string().min(2).max(30).required().messages({
			'any.required': '17',
			'string.empty': '17',
			'string.min': '09',
			'string.max': '09',
		}),
		unit: Joi.string().required().messages({
			'any.required': '32',
			'string.empty': '32',
		}),
	});
}
