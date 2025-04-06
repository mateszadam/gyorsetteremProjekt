import { Router, Request, Response } from 'express';
import { IFood, IController, ICategory } from '../models/models';
import {
	categoryModel,
	foodModel,
	materialModel,
} from '../models/mongooseSchema';
import { authAdminToken, authToken } from '../services/tokenService';
import defaultAnswers from '../helpers/statusCodeHelper';
import { Types } from 'mongoose';
import Joi from 'joi';
import languageBasedMessage from '../helpers/languageHelper';

export default class foodController implements IController {
	public router = Router();
	public endPoint = '/food';
	private food = foodModel;
	private category = categoryModel;
	private material = materialModel;
	constructor() {
		this.router.post('', authAdminToken, this.addFood);
		this.router.get('', authToken, this.filterFood);
		this.router.put('/:id', authAdminToken, this.updateFood);
		this.router.delete('/:id', authAdminToken, this.deleteFoodById);
	}

	private filterFood = async (req: Request, res: Response) => {
		try {
			let {
				page = 1,
				limit = 10,
				_id,
				name,
				minPrice,
				maxPrice,
				isEnabled,
				categoryId,
				subCategoryId,
				image,
				fields,
			} = req.query;

			if (
				isNaN(Number(page)) ||
				isNaN(Number(limit)) ||
				Number(page) < 0 ||
				Number(limit) < 0
			) {
				throw Error('93');
			}

			const pageNumber = Number(page);
			const itemsPerPage = Number(limit);
			const skip = (pageNumber - 1) * itemsPerPage;
			const allowedFields = [
				'_id',
				'name',
				'englishName',
				'materials',
				'minPrice',
				'maxPrice',
				'isEnabled',
				'categoryId',
				'subCategoryId',
				'image',
			];

			const query: any = {};
			query.isDeleted = false;
			if (_id) query._id = new Types.ObjectId(_id as string);
			if (name) {
				query.$or = [
					{ name: new RegExp(name as string, 'i') },
					{ englishName: new RegExp(name as string, 'i') },
				];
			}
			if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
				query.price = { $gte: Number(maxPrice), $lte: Number(minPrice) };
			} else if (minPrice && maxPrice && Number(minPrice) < Number(maxPrice)) {
				query.price = { $gte: Number(minPrice), $lte: Number(maxPrice) };
			} else {
				if (minPrice) query.price = { $gte: Number(minPrice) };
				if (maxPrice) query.price = { $lte: Number(maxPrice) };
			}
			if (isEnabled) query.isEnabled = isEnabled === 'true';
			if (categoryId) {
				if (!(await this.category.findOne({ _id: categoryId })))
					throw Error('44');
				query.categoryId = new Types.ObjectId(categoryId as string);
			}
			if (subCategoryId) {
				if (
					!(await this.category.findOne({
						_id: new Types.ObjectId(subCategoryId as string),
					}))
				)
					throw Error('84');
				query.subCategoryId = new Types.ObjectId(subCategoryId as string);
			}
			if (image) query.image = new RegExp(image as string);

			let projection: any = { _id: 1 };
			if (typeof fields === 'string') {
				fields = [fields];
			}
			if (fields && Array.isArray(fields)) {
				if (fields.includes('englishName')) {
					projection = {
						_id: 1,
						name: 1,
						englishName: 1,
						materials: 1,
						price: 1,
						isEnabled: 1,
						categoryId: 1,
						subCategoryId: 1,
						image: 1,
					};
				} else {
					if (fields.includes('name')) fields.push('englishName');

					(fields as string[]).forEach((field) => {
						if (allowedFields.includes(field)) {
							projection[field] = 1;
						}
					});
				}
			} else {
				projection = {
					_id: 1,
					name: 1,
					englishName: 1,
					materials: 1,
					price: 1,
					isEnabled: 1,
					categoryId: 1,
					subCategoryId: 1,
					image: 1,
				};
			}

			let materialChanges = await this.food.aggregate<IFood>([
				{ $match: query },
				{ $project: projection },
				{ $skip: skip },
				{ $limit: itemsPerPage },
			]);
			if (
				!(
					Array.isArray(fields) &&
					fields.includes('englishName') &&
					!fields.includes('name')
				)
			) {
				materialChanges = languageBasedMessage.getLangageBasedName(
					req,
					materialChanges
				) as IFood[];
			}

			res.send({
				items: materialChanges,
				pageCount: Math.ceil(
					(await this.food.countDocuments(query)) / itemsPerPage
				),
			});
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
			);
		}
	};
	private addFood = async (req: Request, res: Response) => {
		try {
			const foodInput: IFood = req.body;
			await this.foodConstraints.validateAsync(foodInput);
			if (
				(await this.category.find({ _id: { $in: foodInput.subCategoryId } }))
					.length !== foodInput.subCategoryId!.length
			) {
				throw Error('84');
			}
			if (!(await this.category.findOne({ _id: foodInput.categoryId }))) {
				throw Error('44');
			}

			if (await this.food.findOne({ name: foodInput.name, isDeleted: false })) {
				throw Error('86');
			}
			const materialIds = foodInput.materials.map((material) => material._id);

			const materials = await this.material.find({
				_id: { $in: materialIds },
			});
			if (materials.length !== materialIds.length) {
				throw Error('85');
			}
			delete foodInput._id;
			const inserted = await this.food.insertMany([foodInput], {
				rawResult: true,
			});

			if (inserted) {
				defaultAnswers.ok(
					res,
					await this.food.findOne({ _id: inserted.insertedIds[0] })
				);
			} else {
				throw Error('02');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
			);
		}
	};

	private deleteFoodById = async (req: Request, res: Response) => {
		try {
			const id = req.params.id;

			if (id) {
				const foodDeleteResponse = await this.food.findByIdAndUpdate(
					{
						_id: id,
					},
					{ isDeleted: true }
				);
				if (foodDeleteResponse) {
					defaultAnswers.ok(res, foodDeleteResponse);
				} else {
					throw Error('43');
				}
			} else {
				throw Error('43');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
			);
		}
	};

	private updateFood = async (req: Request, res: Response) => {
		try {
			const changedData: IFood = req.body;
			const id = req.params.id;

			if (id) {
				let oldFood: IFood | null = await this.food.findById(id);
				if (!oldFood) {
					throw Error('73');
				}
				const newFood: IFood = {
					...(oldFood = { ...changedData, _id: oldFood._id }),
				};

				const response = await this.food.find({
					$and: [{ name: newFood.name }, { _id: { $ne: id } }],
				});
				if (response.length > 0) {
					throw Error('86');
				}

				const category: ICategory | null = await this.category.findOne({
					_id: newFood.categoryId,
				});
				if (!category) {
					throw Error('44');
				}
				const subCategory: ICategory[] | null = await this.category.find({
					_id: newFood.subCategoryId,
				});
				if (
					subCategory &&
					newFood.subCategoryId!.length !== subCategory.length
				) {
					throw Error('84');
				}
				delete newFood._id;
				const newFoodToStore: IFood = {
					...(oldFood = {
						...newFood,
					}),
				};
				const foods: IFood | null = await this.food.findByIdAndUpdate(
					id,
					newFoodToStore
				);
				if (foods) {
					defaultAnswers.ok(res, await this.food.findOne({ _id: id }));
				} else {
					throw Error('45');
				}
			} else {
				throw Error('07');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
			);
		}
	};

	private foodConstraints = Joi.object({
		name: Joi.string()
			.pattern(/^[a-zA-ZáéiíoóöőuúüűÁÉIÍOÓÖŐUÚÜŰä0-9 ]+$/)
			.required()
			.messages({
				'string.empty': '17',
				'string.pattern.base': '19',
				'any.required': '17',
			}),
		price: Joi.number().greater(0).required().messages({
			'number.base': '21',
			'number.greater': '22',
			'any.required': '21',
		}),
		materials: Joi.array()
			.items(
				Joi.object({
					_id: Joi.string().required().messages({
						'string.empty': '23',
						'any.required': '23',
					}),
					quantity: Joi.number().greater(0).required().messages({
						'number.base': '24',
						'number.greater': '25',
					}),
				})
			)
			.min(1)
			.required()
			.messages({
				'array.min': '23',
				'array.empty': '23',
				'any.required': '23',
			}),
		subCategoryId: Joi.array().required().messages({
			'array.empty': '70',
			'any.required': '70',
		}),
		categoryId: Joi.string().required().messages({
			'string.empty': '27',
			'any.required': '27',
		}),
		image: Joi.string().required().messages({
			'string.empty': '29',
			'any.required': '29',
		}),
		isEnabled: Joi.boolean().messages({
			'boolean.empty': '65',
			'any.required': '65',
		}),
		englishName: Joi.string().required().messages({
			'string.empty': '78',
			'string.pattern.base': '78',
			'any.required': '78',
		}),
	});
}
