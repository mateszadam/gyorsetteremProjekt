import { Router, Request, Response } from 'express';
import { ICategory, IController } from '../models/models';
import { categoryModel } from '../models/mongooseSchema';
import { authAdminToken } from '../services/tokenService';
import { defaultAnswers } from '../helpers/statusCodeHelper';
const validate = require('validate.js');
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
			if (newCategory) {
				const response = await this.category.insertMany([newCategory]);
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
			const response: ICategory[] = await this.category.find({});
			if (response) {
				res.send(response);
			} else {
				throw Error('Failed to get from database');
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
					throw Error('Name not found in database');
				}
			} else {
				throw Error('Name not found in request');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
	private modifyOne = async (req: Request, res: Response) => {
		try {
			const inputCategory: ICategory = req.body;
			const id = req.params.id;

			if (id && validate(inputCategory, this.categoryConstraints)) {
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
					throw Error('Id is not found in database');
				}
			} else {
				throw Error(
					`Validation failed: ${validate(inputCategory, this.categoryConstraints)}`
				);
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};

	private categoryConstraints = {
		name: {
			presence: true,
			length: {
				minimum: 3,
				maximum: 30,
			},
			format: {
				pattern: '[a-zA-Z0-9]+',
				message: 'can only contain alphanumeric characters',
			},
		},
		icon: {
			presence: true,
		},
	};
}
