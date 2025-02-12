import { Router, Request, Response } from 'express';
import { ICategory, IController } from '../models/models';
import { categoryModel } from '../models/mongooseSchema';
import { authAdminToken } from '../services/tokenService';
import defaultAnswers from '../helpers/statusCodeHelper';

import Joi from 'joi';
import languageBasedErrorMessage from '../helpers/laguageHelper';
export default class categoryController implements IController {
	public router = Router();
	private category = categoryModel;
	public endPoint = '/category';

	constructor() {
		this.router.post('/add', authAdminToken, this.add);
		this.router.get('/all', authAdminToken, this.getAll);
		this.router.delete('/:name', authAdminToken, this.deleteOne);
		this.router.put('/:id', authAdminToken, this.modifyOne);
	}

	private add = async (req: Request, res: Response) => {
		try {
			const newCategory: ICategory = req.body;
			const validation =
				await this.categoryConstraints.validateAsync(newCategory);
			if (validation) {
				const response = await this.category.insertMany([newCategory]);
				if (response) {
					defaultAnswers.ok(res);
				} else {
					throw Error(languageBasedErrorMessage.getError(req, '02'));
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
			const response: ICategory[] = await this.category.find({});
			if (response) {
				res.send(response);
			} else {
				throw Error(languageBasedErrorMessage.getError(req, '02'));
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
	private deleteOne = async (req: Request, res: Response) => {
		try {
			const name = req.params.name;

			if (name) {
				const response = await this.category.deleteOne({ name: name });
				if (response.deletedCount > 0) {
					defaultAnswers.ok(res);
				} else {
					throw Error(languageBasedErrorMessage.getError(req, '43'));
				}
			} else {
				throw Error(languageBasedErrorMessage.getError(req, '42'));
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
	private modifyOne = async (req: Request, res: Response) => {
		try {
			const inputCategory: ICategory = req.body;
			const id = req.params.id;
			const validation =
				await this.categoryConstraints.validateAsync(inputCategory);
			console.log(validation);
			if (id && validation) {
				const response = await this.category.updateOne(
					{ _id: id },
					{
						$set: {
							name: inputCategory.name,
							icon: inputCategory.icon,
						},
					}
				);
				if (response.modifiedCount > 0) {
					defaultAnswers.ok(res);
				} else {
					throw Error(languageBasedErrorMessage.getError(req, '06'));
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

	private categoryConstraints = Joi.object({
		name: Joi.string()
			.min(3)
			.max(30)
			.pattern(/^[a-zA-Z0-9]+$/)
			.required()
			.messages({
				'any.required': '17',
				'string.empty': '17',
				'string.min': '18',
				'string.max': '18',
				'string.pattern.base': '19',
			}),
		icon: Joi.string().required().messages({
			'string.empty': '20',
			'any.required': '20',
		}),
	});
}
