import { Router, Request, Response } from 'express';
import { IController, IMaterial } from '../models/models';
import { foodModel, materialModel } from '../models/mongooseSchema';
import { authenticateAdminToken } from '../services/tokenService';
import { defaultAnswers } from '../helpers/statusCodeHelper';

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
			const inputMaterials: IMaterial[] = req.body;
			if (inputMaterials) {
				const databaseAnswer = await this.material.insertMany(inputMaterials);

				if (databaseAnswer) {
					defaultAnswers.ok(res);
				} else {
					throw Error('Error in database');
				}
			} else {
				throw Error('No materials found to insert');
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
					$lookup: {
						from: 'unitOfMeasures',
						localField: '_id',
						foreignField: 'materialName',
						as: 'UOM',
					},
				},
				{
					$project: {
						_id: 1,
						inStock: 1,
						unit: { $ifNull: [{ $arrayElemAt: ['$UOM.unit', 0] }, null] },
					},
				},
				{
					$match: {
						inStock: { $gt: 0 },
					},
				},
			]);
			if (materials) {
				res.status(200).send(materials);
			} else {
				throw Error('Error in database');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
	private getAllMaterialFromRecipe = async (req: Request, res: Response) => {
		try {
			const materialsInStock = await this.material.aggregate([
				{
					$facet: {
						stockMaterials: [
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
						],
						recipeMaterials: [
							{
								$lookup: {
									from: 'foods',
									pipeline: [
										{ $unwind: '$material' },
										{
											$group: {
												_id: '$material.name',
											},
										},
									],
									as: 'recipes',
								},
							},
							{ $unwind: '$recipes' },
							{
								$project: {
									name: '$recipes._id',
									inStock: { $literal: 0 },
								},
							},
						],
					},
				},
				{
					$project: {
						combined: {
							$setUnion: ['$stockMaterials', '$recipeMaterials'],
						},
					},
				},
				{ $unwind: '$combined' },
				{
					$group: {
						_id: '$combined.name',
						inStock: { $max: '$combined.inStock' },
					},
				},
				{
					$lookup: {
						from: 'unitOfMeasures',
						localField: '_id',
						foreignField: 'materialName',
						as: 'UOM',
					},
				},
				{
					$project: {
						_id: 1,
						inStock: 1,
						unit: { $ifNull: [{ $arrayElemAt: ['$UOM.unit', 0] }, null] },
					},
				},
			]);
			if (materialsInStock) {
				res.status(200).send(materialsInStock);
			} else {
				throw Error('Error in database');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
}
