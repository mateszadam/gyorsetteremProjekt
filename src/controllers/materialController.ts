import { Router, Request, Response } from 'express';
import { IController, IMaterial } from '../models/models';
import { foodModel, materialModel } from '../models/mongooseSchema';
import { authAdminToken } from '../services/tokenService';
import { defaultAnswers } from '../helpers/statusCodeHelper';
import { validate } from 'validate.js';

export default class materialController implements IController {
	public router = Router();
	public endPoint = '/material';
	private material = materialModel;
	private food = foodModel;
	constructor() {
		this.router.post('/add', authAdminToken, this.addMaterial);
		this.router.get('/stock', authAdminToken, this.getAllMaterial);
		this.router.get('/all', authAdminToken, this.getAllMaterialFromRecipe);
	}

	private addMaterial = async (req: Request, res: Response) => {
		try {
			const inputMaterials: IMaterial[] = req.body;
			const validation = validate(inputMaterials, this.materialConstraints);
			if (!validation) {
				const databaseAnswer = await this.material.insertMany(inputMaterials);

				if (databaseAnswer) {
					defaultAnswers.ok(res);
				} else {
					throw Error('Error in database');
				}
			} else {
				res.status(400).json(validation);
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

	materialConstraints = {
		name: {
			presence: {
				allowEmpty: false,
				message: '^A név mező kitöltése kötelező.',
			},
			format: {
				pattern: '[a-zA-Z0-9]+',
				message: '^A név mező csak betűket és számokat tartalmazhat',
			},
		},
		quantity: {
			presence: {
				allowEmpty: false,
				message: '^A mennyiség megadása kötelező.',
			},
			numericality: {
				greaterThan: 0,
				message: '^A a mennyigégnek 0 nál nagyobbnak kell lennie.',
			},
		},
		message: {},
	};
}
