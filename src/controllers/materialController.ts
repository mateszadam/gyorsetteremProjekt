import { Router, Request, Response } from 'express';
import { defaultAnswers, IController, Material } from '../models/models';
import { foodModel, materialModel, orderModel } from '../models/mongooseSchema';
import { authenticateAdminToken, isAuthValid } from '../services/tokenService';
import { log } from 'console';

export default class materialController implements IController {
	public router = Router();
	public endPoint = '/material';
	private material = materialModel;
	private food = foodModel;
	constructor() {
		this.router.post('/add', authenticateAdminToken, this.addMaterial);
		this.router.get('/stock', authenticateAdminToken, this.getAllMaterial);
		this.router.get(
			'/all',
			authenticateAdminToken,
			this.getAllMaterialFromRecipe
		);
	}

	private addMaterial = async (req: Request, res: Response) => {
		try {
			const inputMaterials: Material[] = req.body.itemsToInsert;
			if (inputMaterials) {
				log('fut');
				const user = await this.material.insertMany(inputMaterials);
				log(user);
				if (user) {
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

	private getAllMaterial = async (req: Request, res: Response) => {
		try {
			const materials = await this.material.aggregate([
				{
					$group: {
						_id: '$name',
						inStock: { $sum: '$quantity' },
					},
				},
				{
					$project: {
						_id: 0,
						name: '$_id',
						inStock: 1,
					},
				},
			]);
			if (materials) {
				res.status(200).send(materials);
			} else {
				defaultAnswers.badRequest(res);
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
	private getAllMaterialFromRecipe = async (req: Request, res: Response) => {
		try {
			const materialsInStock = await this.material.aggregate([
				{
					$group: {
						_id: '$name',
						inStock: { $sum: '$quantity' },
					},
				},
				{
					$project: {
						_id: 0,
						name: '$_id',
						inStock: 1,
					},
				},
			]);
			const materials = await this.food.aggregate([
				{
					$unwind: '$material',
				},
				{
					$group: {
						_id: '$material.name',
					},
				},
				{
					$project: {
						_id: 0,
						name: '$_id',
						inStock: { $literal: 0 },
					},
				},
			]);
			materials.forEach((x) => {
				if (!materialsInStock.includes(x.name)) {
					materialsInStock.push(x);
				}
			});
			if (materialsInStock) {
				res.status(200).send(materialsInStock);
			} else {
				defaultAnswers.badRequest(res);
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
}
