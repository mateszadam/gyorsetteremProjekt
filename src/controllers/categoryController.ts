import e, { Router, Request, Response } from 'express';
import { ICategory, IController } from '../models/models';
import { categoryModel, foodModel } from '../models/mongooseSchema';
import { authAdminToken, authToken } from '../services/tokenService';
import defaultAnswers from '../helpers/statusCodeHelper';

import Joi from 'joi';
import languageBasedErrorMessage from '../helpers/languageHelper';

import mongoose from 'mongoose';
export default class categoryController implements IController {
	public router = Router();
	private category = categoryModel;
	private food = foodModel;
	public endPoint = '/category';

	constructor() {
		this.router.get('/main', authToken, this.getMainCategories);
		this.router.get('/sub', authToken, this.getSubCategories);
		this.router.post('', authAdminToken, this.add);
		this.router.delete('/:id', authAdminToken, this.deleteOne);
		this.router.put('/:id', authAdminToken, this.modifyOne);
		this.router.get('', authToken, this.filterCategory);
	}

	private getMainCategories = async (req: Request, res: Response) => {
		try {
			const mainCategories = await this.food.aggregate([
				{ $project: { _id: 0, categoryId: 1 } },
				{
					$lookup: {
						from: 'categories',
						localField: 'categoryId',
						foreignField: '_id',
						as: 'category',
					},
				},
				{ $unwind: '$category' },
				{
					$group: {
						_id: '$category._id',
						name: { $first: '$category.name' },
						englishName: { $first: '$category.englishName' },
						icon: { $first: '$category.icon' },
					},
				},
			]);

			defaultAnswers.ok(res, mainCategories ?? []);
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};

	private getSubCategories = async (req: Request, res: Response) => {
		try {
			const { main } = req.query;

			let subCategories = await this.food.aggregate([
				{ $match: { categoryId: new mongoose.Types.ObjectId(main as string) } },
				{ $project: { _id: 0, subCategoryId: 1 } },
				{ $unwind: '$subCategoryId' },
				{
					$lookup: {
						from: 'categories',
						localField: 'subCategoryId',
						foreignField: '_id',
						as: 'category',
					},
				},
				{ $unwind: '$category' },
				{
					$group: {
						_id: '$category._id',
						name: { $first: '$category.name' },
						englishName: { $first: '$category.englishName' },
						icon: { $first: '$category.icon' },
					},
				},
			]);
			if (subCategories.length === 0) {
				throw Error('95');
			}

			defaultAnswers.ok(res, subCategories);
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};

	private filterCategory = async (req: Request, res: Response) => {
		try {
			let {
				page = 1,
				limit = 10,
				_id,
				name,
				englishName,
				icon,
				fields,
			} = req.query;

			if (isNaN(Number(page)) || isNaN(Number(limit))) {
				throw Error('93');
			}

			const pageNumber = Number(page);
			const itemsPerPage = Number(limit);
			const skip = (pageNumber - 1) * itemsPerPage;
			const allowedFields = ['_id', 'name', 'englishName', 'icon'];

			const query: any = {};
			if (_id) query._id = new mongoose.Types.ObjectId(_id as string);
			if (name) query.name = new RegExp(name as string, 'i');
			if (englishName)
				query.englishName = new RegExp(englishName as string, 'i');
			if (icon) query.icon = new RegExp(icon as string, 'i');

			let projection: any = { _id: 1 };

			if (typeof fields === 'string') {
				fields = [fields];
			}

			if (fields) {
				(fields as string[]).forEach((field) => {
					if (allowedFields.includes(field)) {
						projection[field] = 1;
					}
				});
			} else {
				projection = {
					_id: 1,
					name: 1,
					englishName: 1,
					icon: 1,
				};
			}

			const categories = await this.category.aggregate([
				{ $match: query },
				{ $project: projection },
				{ $skip: skip },
				{ $limit: itemsPerPage },
			]);

			res.send({
				items: categories,
				pageCount: Math.ceil(
					(await this.category.countDocuments(query)) / itemsPerPage
				),
			});
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};

	private add = async (req: Request, res: Response) => {
		try {
			const newCategory: ICategory = req.body;
			await this.categoryConstraints.validateAsync(newCategory);
			if ((await this.category.find({ name: newCategory.name })).length === 0) {
				const response = await this.category.insertMany([newCategory], {
					rawResult: true,
				});

				if (response) {
					defaultAnswers.ok(
						res,
						await this.category.findOne({ _id: response.insertedIds[0] })
					);
				} else {
					throw Error('02');
				}
			} else {
				throw Error('75');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};
	private deleteOne = async (req: Request, res: Response) => {
		try {
			const id = req.params.id;
			if (id) {
				const response = await this.category.findByIdAndDelete(id);
				if (response) {
					defaultAnswers.ok(res, response);
				} else {
					throw Error('43');
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
	private modifyOne = async (req: Request, res: Response) => {
		try {
			const inputCategory: ICategory = req.body;
			const id = req.params.id;
			await this.categoryConstraints.validateAsync(inputCategory);
			if (id) {
				const response = await this.category.find({
					$and: [{ name: inputCategory.name }, { _id: { $ne: id } }],
				});

				if (response.length === 0) {
					const response = await this.category.updateOne(
						{ _id: id },
						{
							$set: {
								name: inputCategory.name,
								icon: inputCategory.icon,
								englishName: inputCategory.englishName,
							},
						}
					);
					if (response.matchedCount > 0) {
						defaultAnswers.ok(res, await this.category.findOne({ _id: id }));
					} else {
						throw Error('44');
					}
				} else {
					throw Error('75');
				}
			} else {
				throw Error('07');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};

	private categoryConstraints = Joi.object({
		name: Joi.string()
			.min(2)
			.max(30)
			.pattern(/^[a-zA-ZáéiíoóöőuúüűÁÉIÍOÓÖŐUÚÜŰä0-9 ]+$/)
			.required()
			.messages({
				'any.required': '17',
				'string.empty': '17',
				'string.min': '09',
				'string.max': '09',
				'string.pattern.base': '19',
			}),
		icon: Joi.string()
			.required()
			.messages({ 'string.empty': '20', 'any.required': '20' }),
		englishName: Joi.string().required().messages({
			'string.empty': '78',
			'string.pattern.base': '78',
			'any.required': '78',
		}),
	});
}
