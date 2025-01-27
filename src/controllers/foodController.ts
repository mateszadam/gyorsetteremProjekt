import { Router, Request, Response } from 'express';
import { defaultAnswers, Food, IController, Material } from '../models/models';
import { foodModel, materialModel, orderModel } from '../models/mongooseSchema';
import {
	authenticateAdminToken,
	authenticateToken,
	isAuthValid,
} from '../services/tokenService';
import { log } from 'console';

/**
 *
 * @openapi
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
 *             type: object
 *             properties:
 *               food:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Food'
 *     responses:
 *       200:
 *         description: Food items added successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Not authorized
 *
 * /food/all:
 *   get:
 *     summary: Get all enabled food items
 *     tags: [Food]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all enabled food items
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Food'
 *       401:
 *         description: Not authorized
 *
 * /food/allToOrder:
 *   get:
 *     summary: Get food items available for ordering (name and price only)
 *     tags: [Food]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of food items with name and price
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
 *         description: Not authorized
 *
 * /food/{name}:
 *   get:
 *     summary: Get food item by name
 *     tags: [Food]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the food item
 *     responses:
 *       200:
 *         description: Food item details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Food'
 *       401:
 *         description: Not authorized
 *
 * /food/update:
 *   put:
 *     summary: Update a food item
 *     tags: [Food]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               params:
 *                 $ref: '#/components/schemas/Food'
 *     responses:
 *       200:
 *         description: Food item updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Not authorized
 *
 * /food/disable/{name}:
 *   patch:
 *     summary: Disable a food item
 *     tags: [Food]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the food item to disable
 *     responses:
 *       200:
 *         description: Food item disabled successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Not authorized
 *
 * /food/enable/{name}:
 *   patch:
 *     summary: Enable a food item
 *     tags: [Food]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the food item to enable
 *     responses:
 *       200:
 *         description: Food item enabled successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Not authorized
 *
 * components:
 *   schemas:
 *     Food:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
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
 *       required:
 *         - name
 *         - price
 *         - material
 */
export default class foodController implements IController {
	public router = Router();
	public endPoint = '/food';
	private food = foodModel;

	constructor() {
		this.router.post('/add', authenticateAdminToken, this.addFood);
		this.router.get('/all', authenticateToken, this.getFood);
		this.router.get('/allToOrder', authenticateToken, this.getFoodToOrder);
		this.router.get('/:name', authenticateToken, this.getFoodByName);

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
			const inputMaterials: Food[] = req.body.food;

			if (inputMaterials) {
				const inserted = await this.food.insertMany(inputMaterials);
				if (inserted) {
					defaultAnswers.ok(res);
				} else {
					defaultAnswers.badRequest(res);
				}
			} else {
				defaultAnswers.badRequest(res);
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};

	private getFood = async (req: Request, res: Response) => {
		try {
			const foods = await this.food.find({ isEnabled: true });
			if (foods) {
				res.send(foods);
			} else {
				defaultAnswers.badRequest(res);
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
	private updateFood = async (req: Request, res: Response) => {
		try {
			const newFood: Food = req.body.params;
			if (newFood) {
				const foods = await this.food.updateOne(
					{
						_id: newFood._id,
					},
					{
						name: newFood.name,
						material: newFood.material,
						price: newFood.price,
						isEnabled: newFood.isEnabled,
					}
				);
				if (foods.modifiedCount > 0) {
					res.send(foods);
				} else {
					defaultAnswers.badRequest(res);
				}
			} else {
				defaultAnswers.badRequest(res);
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
					defaultAnswers.badRequest(res);
				}
			} else {
				defaultAnswers.badRequest(res);
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
					defaultAnswers.badRequest(res);
				}
			} else {
				defaultAnswers.badRequest(res);
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
				defaultAnswers.badRequest(res);
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
				defaultAnswers.badRequest(res);
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
}
