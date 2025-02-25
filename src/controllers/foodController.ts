import { Router, Request, Response } from 'express';
import { IFood, IController } from '../models/models';
import { categoryModel, foodModel } from '../models/mongooseSchema';
import { authAdminToken, authToken } from '../services/tokenService';
import defaultAnswers from '../helpers/statusCodeHelper';
import { UpdateWriteOpResult } from 'mongoose';
import Joi from 'joi';
import languageBasedErrorMessage from '../helpers/languageHelper';
import { log } from 'console';

export default class foodController implements IController {
	public router = Router();
	public endPoint = '/food';
	private food = foodModel;
	private category = categoryModel;
	constructor() {
		this.router.post('/add', authAdminToken, this.addFood);
		this.router.get('/allEnabled', authToken, this.getAllEnabledFood);
		this.router.get('/all', authToken, this.getFood);

		this.router.get('/allToOrder', authToken, this.getFoodToOrder);
		this.router.get('/name/:name', authToken, this.getFoodByName);
		this.router.get('/category/:category', authToken, this.getFoodByCategory);
		this.router.get('/filter', authToken, this.filterFood);

		this.router.put('/update/:id', authAdminToken, this.updateFood);

		this.router.patch('/disable/:name', authAdminToken, this.disableByName);
		this.router.patch('/enable/:name', authAdminToken, this.enableByName);

		this.router.delete('/name/:name', authAdminToken, this.deleteFood);
	}

	private filterFood = async (req: Request, res: Response) => {
		try {
			const { field, value } = req.query;
			if (field && value) {
				const selectedItems = await this.food
					.find({ [field as string]: value })
					.populate('categoryId', '-_id')
					.populate('subCategoryId', '-_id');
				if (selectedItems.length > 0) {
					res.send(selectedItems);
				} else {
					throw Error('77');
				}
			} else {
				throw Error('76');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};
	private addFood = async (req: Request, res: Response) => {
		try {
			const foodInput: IFood = req.body;
			await this.foodConstraints.validateAsync(foodInput);
			if (await this.category.findOne({ _id: foodInput.categoryId })) {
				const inserted = await this.food.insertMany([foodInput]);
				if (inserted) {
					defaultAnswers.ok(res);
				} else {
					throw Error('02');
				}
			} else {
				throw Error('44');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};
	private getFood = async (req: Request, res: Response) => {
		try {
			const foods = await this.food
				.find()
				.populate('categoryId', '-_id')
				.populate('subCategoryId', '-_id');
			if (foods) {
				res.send(foods);
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

	private deleteFood = async (req: Request, res: Response) => {
		try {
			const name = req.params.name;

			if (name) {
				const foodDeleteResponse = await this.food.deleteMany({ name: name });
				if (foodDeleteResponse.deletedCount > 0) {
					defaultAnswers.ok(res);
				} else {
					throw Error('43');
				}
			} else {
				throw Error('43');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};

	private getAllEnabledFood = async (req: Request, res: Response) => {
		try {
			const foods = await this.food
				.find({ isEnabled: true }, { 'material._id': 0 })
				.populate('categoryId', '-_id')
				.populate('subCategoryId', '-_id');
			if (foods) {
				res.send(foods);
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
	private updateFood = async (req: Request, res: Response) => {
		try {
			const newFood: IFood = req.body;
			const id = req.params.id;
			await this.foodConstraints.validateAsync(newFood);
			if (id) {
				const foods: UpdateWriteOpResult = await this.food.updateOne(
					{
						_id: id,
					},
					{
						name: newFood.name,
						materials: newFood.materials,
						price: newFood.price,
						isEnabled: newFood.isEnabled,
						categoryId: newFood.categoryId,
					}
				);
				if (foods.modifiedCount > 0) {
					res.send(foods);
				} else {
					throw Error('45');
				}
			} else {
				res.status(400).json('07');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};

	private disableByName = async (req: Request, res: Response) => {
		try {
			const name = req.params.name;
			if (name) {
				const foods: UpdateWriteOpResult = await this.food.updateOne(
					{
						name: name,
					},
					{
						$set: { isEnabled: false },
					}
				);
				if (foods.modifiedCount > 0) {
					defaultAnswers.ok(res);
				} else {
					throw Error('73');
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
	private enableByName = async (req: Request, res: Response) => {
		try {
			const name = req.params.name;
			if (name) {
				const foods: UpdateWriteOpResult = await this.food.updateOne(
					{
						name: name,
					},
					{
						$set: { isEnabled: true },
					}
				);
				if (foods.modifiedCount > 0) {
					defaultAnswers.ok(res);
				} else {
					throw Error('73');
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
	private getFoodToOrder = async (req: Request, res: Response) => {
		try {
			const foods = await this.food
				.find(
					{ isEnabled: true },
					{ _id: 0, name: 1, price: 1, image: 1, categoryId: 1 }
				)
				.populate('categoryId', '-_id')
				.populate('subCategoryId', '-_id');
			if (foods) {
				res.send(foods);
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
	private getFoodByName = async (req: Request, res: Response) => {
		try {
			const name = req.params.name;
			if (name) {
				const foods = await this.food
					.findOne({ name: name }, { 'materials._id': 0 })
					.populate('categoryId', '-_id')
					.populate('subCategoryId', '-_id');
				if (foods) {
					res.send(foods);
				} else {
					throw Error('73');
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
	private getFoodByCategory = async (req: Request, res: Response) => {
		try {
			const category = req.params.category;
			if (category) {
				const selectedCategory = await this.category.findOne({
					name: category,
				});
				if (selectedCategory) {
					const foods = await this.food
						.find({
							categoryId: { $in: selectedCategory?._id },
						})
						.populate('categoryId', '-_id')
						.populate('subCategoryId', '-_id');
					if (foods) {
						res.send(foods);
					} else {
						throw Error('02');
					}
				} else {
					throw Error('44');
				}
			} else {
				throw Error('50');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
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
					name: Joi.string().required().messages({
						'string.empty': '41',
						'any.required': '41',
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
