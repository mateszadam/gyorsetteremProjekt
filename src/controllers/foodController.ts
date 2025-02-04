import { Router, Request, Response } from 'express';
import { IFood, IController, ICategory } from '../models/models';
import { categoryModel, foodModel } from '../models/mongooseSchema';
import {
	authenticateAdminToken,
	authenticateToken,
} from '../services/tokenService';
import { defaultAnswers } from '../helpers/statusCodeHelper';

/**
 * @swagger
 * tags:
 *   name: Food
 *   description: Food management endpoints
 *
 * /food/add:
 *   post:
 *     summary: Add new food items
 *     tags: [Food]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *               $ref: '#/components/schemas/Food'
 *     responses:
 *       200:
 *         description: Food items added successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *
 * /food/allEnabled:
 *   get:
 *     summary: Get all enabled food items
 *     tags: [Food]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of enabled food items
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Food'
 *       401:
 *         description: Unauthorized
 * /food/all:
 *   get:
 *     summary: Get all enabled food items
 *     tags: [Food]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of enabled food items
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Food'
 *       401:
 *         description: Unauthorized
 * /food/allToOrder:
 *   get:
 *     summary: Get food items for ordering (name and price only)
 *     tags: [Food]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of food items
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   price:
 *                     type: number
 *       401:
 *         description: Unauthorized
 *
 * /food/name/{name}:
 *   get:
 *     summary: Get food by name
 *     tags: [Food]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: name
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Food details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Food'
 *       401:
 *         description: Unauthorized
 * /food/category/{category}:
 *   get:
 *     summary: Get food by category
 *     tags: [Food]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: category
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Food details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Food'
 *       401:
 *         description: Unauthorized
 *
 * /food/update:
 *   put:
 *     summary: Update food item
 *     tags: [Food]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Food'
 *     responses:
 *       200:
 *         description: Food updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *
 * /food/disable/{name}:
 *   patch:
 *     summary: Disable food item
 *     tags: [Food]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: name
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Food disabled successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *
 * /food/enable/{name}:
 *   patch:
 *     summary: Enable food item
 *     tags: [Food]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: name
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Food enabled successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *
 * components:
 *   schemas:
 *     Food:
 *       type: object
 *       required:
 *         - name
 *         - price
 *         - material
 *       properties:
 *         name:
 *           type: string
 *         price:
 *           type: number
 *         material:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               quantity:
 *                 type: number
 *         isEnabled:
 *           type: boolean
 *           default: true
 *         category:
 *           type: string
 */
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
		this.router.get('name/:name', authenticateToken, this.getFoodByName);
		this.router.get(
			'/category/:category',
			authenticateToken,
			this.getFoodByCategory
		);

		this.router.put('/update', authenticateAdminToken, this.updateFood);

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
				if (await this.category.findOne({ name: inputMaterials.category })) {
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
			const foods = await this.food.find({});
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
			const foods = await this.food.find({ isEnabled: true });
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
			if (
				newFood._id &&
				newFood.name &&
				newFood.material &&
				newFood.price &&
				newFood.isEnabled
			) {
				const foods = await this.food.updateOne(
					{
						_id: newFood._id,
					},
					{
						name: newFood.name,
						material: newFood.material,
						price: newFood.price,
						isEnabled: newFood.isEnabled,
						category: newFood.category,
					}
				);
				if (foods.modifiedCount > 0) {
					res.send(foods);
				} else {
					throw Error('he id is the request is not found is database');
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
				const foods = await this.food.updateOne(
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
				const foods = await this.food.updateOne(
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
			const foods = await this.food.find(
				{ isEnabled: true },
				{ _id: 0, name: 1, price: 1 }
			);
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
			const foods = await this.food.find({ name: name });
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
			const foods: ICategory[] = await this.food.find({ categoryId: category });
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
