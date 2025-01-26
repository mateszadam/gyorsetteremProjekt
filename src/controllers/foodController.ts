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
