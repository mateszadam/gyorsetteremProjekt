import { Router, Request, Response } from 'express';
import { IFood, IController, ICategory } from '../models/models';
import { categoryModel, foodModel } from '../models/mongooseSchema';
import {
	authenticateAdminToken,
	authenticateToken,
} from '../services/tokenService';
import { defaultAnswers } from '../helpers/statusCodeHelper';
import { UpdateOneModel, UpdateWriteOpResult } from 'mongoose';

export default class foodController implements IController {
	public router = Router();
	public endPoint = '/food';
	private food = foodModel;
	private category = categoryModel;

	constructor() {
		this.router.post('/add', authenticateAdminToken, this.addFood);
		this.router.get('/allEnabled', authenticateToken, this.getAllEnabledFood);
		this.router.get('/all', authenticateToken, this.getFood);

		this.router.get('/allToOrder', authenticateToken, this.getFoodToOrder);
		this.router.get('/name/:name', authenticateToken, this.getFoodByName);
		this.router.get(
			'/category/:category',
			authenticateToken,
			this.getFoodByCategory
		);

		this.router.put('/update/:id', authenticateAdminToken, this.updateFood);

		this.router.patch(
			'/disable/:name',
			authenticateAdminToken,
			this.disableByName
		);
		this.router.patch(
			'/enable/:name',
			authenticateAdminToken,
			this.enableByName
		);
	}

	private addFood = async (req: Request, res: Response) => {
		try {
			const inputMaterials: IFood = req.body;
			if (inputMaterials) {
				if (await this.category.findOne({ _id: inputMaterials.categoryId })) {
					const inserted = await this.food.insertMany(inputMaterials);
					if (inserted) {
						defaultAnswers.ok(res);
					} else {
						throw Error('Error in database');
					}
				} else {
					throw Error('Input category not in categories');
				}
			} else {
				throw Error('Food in the body is not found in the request');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
	private getFood = async (req: Request, res: Response) => {
		try {
			const foods = await this.food.find().populate('categoryId', '-_id');
			if (foods) {
				res.send(foods);
			} else {
				throw Error('Error in database');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};

	private getAllEnabledFood = async (req: Request, res: Response) => {
		try {
			const foods = await this.food
				.find({ isEnabled: true }, { 'material._id': 0 })
				.populate('categoryId', '-_id');
			if (foods) {
				res.send(foods);
			} else {
				throw Error('Error in database');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
	private updateFood = async (req: Request, res: Response) => {
		try {
			const newFood: IFood = req.body;
			const id = req.params.id;
			if (
				newFood.name &&
				newFood.materials &&
				newFood.price &&
				newFood.isEnabled &&
				id
			) {
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
					throw Error('The id is the request is not found is database');
				}
			} else {
				throw Error('Food in the body is not found in the request');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
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
					throw Error('The name in the request is not found is database');
				}
			} else {
				throw Error('The name is not found in the request');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
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
					throw Error('The name in the request is not found is database');
				}
			} else {
				throw Error('The name is not found in the request');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
	private getFoodToOrder = async (req: Request, res: Response) => {
		try {
			const foods = await this.food
				.find(
					{ isEnabled: true },
					{ _id: 0, name: 1, price: 1, image: 1, categoryId: 0 }
				)
				.populate('categoryId', '-_id');
			if (foods) {
				res.send(foods);
			} else {
				throw Error('Error in database');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
	private getFoodByName = async (req: Request, res: Response) => {
		try {
			const name = req.params.name;
			const foods = await this.food
				.findOne({ name: name })
				.populate('categoryId', '-_id');
			if (foods) {
				res.send(foods);
			} else {
				throw Error('Error in database');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
	private getFoodByCategory = async (req: Request, res: Response) => {
		try {
			const category = req.params.category;
			const selectedCategory = await this.category.findOne({ name: category });
			const foods: IFood[] = await this.food.find({
				category: selectedCategory?._id,
			});
			if (foods) {
				res.send(foods);
			} else {
				throw Error('Error in database');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
}
