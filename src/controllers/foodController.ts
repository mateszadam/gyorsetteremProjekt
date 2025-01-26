import { Router, Request, Response } from 'express';
import { defaultAnswers, Food, IController, Material } from '../models/models';
import { foodModel, materialModel, orderModel } from '../models/mongooseSchema';
import {
	authenticateAdminToken,
	authenticateToken,
	isAuthValid,
} from '../services/tokenService';
import { log } from 'console';

export default class foodController implements IController {
	public router = Router();
	public endPoint = '/food';
	private food = foodModel;

	/**
	 * @swagger
	 * /food/add:
	 *   post:
	 *     summary: Add new food items
	 *     tags: [Food]
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
	 *                   type: object
	 *                   properties:
	 *                     name:
	 *                       type: string
	 *                     price:
	 *                       type: number
	 *                     ingredients:
	 *                       type: object
	 *                       properties:
	 *                         name:
	 *                           type: string
	 *                           default: kenyér
	 *                         quantity:
	 *                           type: number
	 *                           default: 2
	 *                   required:
	 *                     - name
	 *                     - price
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
	 *     summary: Get all food items
	 *     tags: [Food]
	 *     responses:
	 *       200:
	 *         description: List of all food items
	 *       400:
	 *         description: Bad request
	 *       401:
	 *         description: Not authorized
	 *
	 * /food/allToOrder:
	 *   get:
	 *     summary: Get food items for order
	 *     tags: [Food]
	 *     responses:
	 *       200:
	 *         description: List of food items for order
	 *       400:
	 *         description: Bad request
	 *       401:
	 *         description: Not authorized
	 * /food/{name}:
	 *   get:
	 *     summary: Get food item by name
	 *     tags: [Food]
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
	 *       400:
	 *         description: Bad request
	 *       401:
	 *         description: Not authorized
	 */

	constructor() {
		this.router.post('/add', authenticateAdminToken, this.addFood);
		this.router.get('/all', authenticateToken, this.getFood);
		this.router.get('/allToOrder', authenticateToken, this.getFoodToOrder);
		this.router.get('/:name', authenticateToken, this.getFoodByName);
	}

	private addFood = async (req: Request, res: Response) => {
		try {
			const inputMaterials: Food[] = req.body.food;
			log(inputMaterials);
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
			const foods = await this.food.find({});
			if (foods) {
				res.send(foods);
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
	private getFoodToOrder = async (req: Request, res: Response) => {
		try {
			const foods = await this.food.find({}, { _id: 0, name: 1, price: 1 });
			if (foods) {
				res.send(foods);
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
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
}
