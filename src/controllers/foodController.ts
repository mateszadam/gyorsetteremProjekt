import { Router, Request, Response } from 'express';
import { IFood, IController, ICategory } from '../models/models';
import {
	categoryModel,
	foodModel,
	materialModel,
} from '../models/mongooseSchema';
import { authAdminToken, authToken } from '../services/tokenService';
import defaultAnswers from '../helpers/statusCodeHelper';
import Joi from 'joi';
import languageBasedErrorMessage from '../helpers/languageHelper';

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
			const { field, value, page, limit } = req.query;

			const allowedFields = [
				'name',
				'englishName',
				'price',
				'categoryId',
				'subCategoryId',
			];
			if (field && !allowedFields.includes(field as string)) {
				throw Error('83');
			}

			const pageNumber = Number(page) || 1;
			const itemsPerPage = Number(limit) || 10;
			const skip = (pageNumber - 1) * itemsPerPage;

			if (field && value) {
				const selectedItems = await this.food
					.find({ [field as string]: value })
					.skip(skip)
					.limit(itemsPerPage);
				if (selectedItems.length > 0) {
					res.send({
						items: selectedItems,
						pageCount: Math.ceil(
							(await this.food.countDocuments({ [field as string]: value })) /
								itemsPerPage
						),
					});
				} else {
					throw Error('77');
				}
			} else {
				const allItems = await this.food
					.find({})
					.skip(skip)
					.limit(itemsPerPage);
				if (allItems.length > 0) {
					res.send({
						items: allItems,
						pageCount: Math.ceil(
							(await this.food.countDocuments()) / itemsPerPage
						),
					});
				} else {
					throw Error('77');
				}
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
			if (
				(await this.category.find({ _id: { $in: foodInput.subCategoryId } }))
					.length !== foodInput.subCategoryId!.length
			) {
				throw Error('84');
			}
			if (!(await this.category.findOne({ _id: foodInput.categoryId }))) {
				throw Error('44');
			}

			if (await this.food.findOne({ name: foodInput.name })) {
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
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};

	private deleteFoodById = async (req: Request, res: Response) => {
		try {
			const id = req.params.id;

			if (id) {
				const foodDeleteResponse = await this.food.findByIdAndDelete({
					_id: id,
				});
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
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};

	private getAllEnabledFood = async (req: Request, res: Response) => {
		try {
			const { page, limit } = req.query;
			const pageNumber = Number(page) || 1;
			const itemsPerPage = Number(limit) || 10;
			const skip = (pageNumber - 1) * itemsPerPage;

			if (pageNumber < 0) {
				throw Error('88');
			}

			const foods = await this.food
				.find({ isEnabled: true })
				.skip(skip)
				.limit(itemsPerPage)
				.populate('categoryId', '-_id')
				.populate('subCategoryId', '-_id');

			if (foods.length > 0) {
				res.send({
					items: foods,
					pageCount: Math.ceil(
						(await this.food.countDocuments({ isEnabled: true })) / itemsPerPage
					),
				});
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
			// await this.foodConstraints.validateAsync(newFood);

			if (id) {
				let oldFood: IFood | null = await this.food.findOne({ _id: id });
				if (!oldFood) {
					throw Error('73');
				}

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
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};

	private disableById = async (req: Request, res: Response) => {
		try {
			const id = req.params.id;
			if (id) {
				const food: IFood | null = await this.food.findByIdAndUpdate(
					{
						_id: id,
					},
					{
						$set: { isEnabled: false },
					}
				);
				if (food) {
					defaultAnswers.ok(res, await this.food.findOne({ _id: id }));
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
	private enableById = async (req: Request, res: Response) => {
		try {
			const id = req.params.id;
			if (id) {
				const food: IFood | null = await this.food.findByIdAndUpdate(
					{
						_id: id,
					},
					{
						$set: { isEnabled: true },
					}
				);
				if (food) {
					defaultAnswers.ok(res, await this.food.findOne({ _id: id }));
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
	// private getFoodToOrder = async (req: Request, res: Response) => {
	// 	try {
	// 		const { page, limit } = req.query;
	// 		const pageNumber = Number(page) || 1;
	// 		const itemsPerPage = Number(limit) || 10;
	// 		const skip = (pageNumber - 1) * itemsPerPage;

	// 		const foods = await this.food
	// 			.find(
	// 				{ isEnabled: true },
	// 				{
	// 					_id: 0,
	// 					name: 1,
	// 					price: 1,
	// 					image: 1,
	// 					categoryId: 1,
	// 					subCategoryId: 1,
	// 					englishName: 1,
	// 				}
	// 			)
	// 			.skip(skip)
	// 			.limit(itemsPerPage)
	// 			.populate('categoryId', '-_id')
	// 			.populate('subCategoryId', '-_id');

	// 		if (foods.length > 0) {
	// 			res.send({
	// 				items: foods,
	// 				pageCount: Math.ceil(
	// 					(await this.food.countDocuments({ isEnabled: true })) / itemsPerPage
	// 				),
	// 			});
	// 		} else {
	// 			throw Error('02');
	// 		}
	// 	} catch (error: any) {
	// 		defaultAnswers.badRequest(
	// 			res,
	// 			languageBasedErrorMessage.getError(req, error.message)
	// 		);
	// 	}
	// };
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
