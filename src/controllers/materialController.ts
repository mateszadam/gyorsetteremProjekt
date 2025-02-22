import { Router, Request, Response } from 'express';
import { IController, IMaterial } from '../models/models';
import { foodModel, materialModel } from '../models/mongooseSchema';
import { authAdminToken } from '../services/tokenService';
import defaultAnswers from '../helpers/statusCodeHelper';
import Joi from 'joi';
import languageBasedErrorMessage from '../helpers/languageHelper';
import { log } from 'console';

export default class materialController implements IController {
	public router = Router();
	public endPoint = '/material';
	private material = materialModel;
	private food = foodModel;
	constructor() {
		this.router.post('/add', authAdminToken, this.addMaterial);
		this.router.get('/stock', authAdminToken, this.getAllMaterial);
		this.router.get('/all', authAdminToken, this.getAllMaterialFromRecipe);
		this.router.get('/changes', authAdminToken, this.getChanges);
		this.router.patch('/update/:id', authAdminToken, this.updateMaterial);
	}

	private updateMaterial = async (req: Request, res: Response) => {
		try {
			const materialChangeId = req.params.id;
			const inputMaterialChange: IMaterial = req.body;
			if (materialChangeId) {
				if (
					inputMaterialChange.message ||
					inputMaterialChange.quantity ||
					inputMaterialChange.name
				) {
					const oldMaterialChange = await this.material
						.findOne(
							{ _id: materialChangeId },
							{ _id: 0, name: 1, quantity: 1, message: 1, date: 1 }
						)
						.lean();
					if (oldMaterialChange) {
						Object.keys(inputMaterialChange).forEach((key) => {
							if (inputMaterialChange[key as keyof IMaterial] === '') {
								delete inputMaterialChange[key as keyof IMaterial];
							}
						});

						const newMaterialChange = {
							...oldMaterialChange,
							...inputMaterialChange,
						};
						log(newMaterialChange);

						const databaseAnswer = await this.material.findByIdAndUpdate(
							materialChangeId,
							newMaterialChange
						);

						if (databaseAnswer?.isModified) {
							defaultAnswers.ok(res);
						} else {
							throw Error('02');
						}
					} else {
						throw Error('67');
					}
				} else {
					throw Error('69');
				}
			} else {
				throw Error('68');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};

	private getChanges = async (req: Request, res: Response) => {
		try {
			const changes = await this.material.find({}).sort({ date: -1 });
			if (changes) {
				res.status(200).send(changes);
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

	private addMaterial = async (req: Request, res: Response) => {
		try {
			const inputMaterial: IMaterial = req.body;
			await this.materialConstraints.validateAsync(inputMaterial);

			if (inputMaterial.quantity < 0) {
				const isEnoughMaterial = await this.material.aggregate([
					{
						$group: {
							_id: '$name',
							inStock: { $sum: '$quantity' },
						},
					},
					{
						$match: {
							_id: inputMaterial.name,
						},
					},
				]);
				if (isEnoughMaterial[0].inStock + inputMaterial.quantity < 0)
					throw Error('71');
			}

			const databaseAnswer = await this.material.insertMany([inputMaterial]);
			if (databaseAnswer) {
				log(databaseAnswer);
				defaultAnswers.ok(res);
			} else {
				throw Error('02');
			}
		} catch (error: any) {
			log(error);
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
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
				throw Error('02');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
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
				throw Error('02');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};

	private materialConstraints = Joi.object({
		name: Joi.string()
			.pattern(/^[a-zA-ZáéiíoóöőuúüűÁÉIÍOÓÖŐUÚÜŰä0-9 ]+$/)
			.required()
			.messages({
				'string.pattern.base': '19',
				'any.required': '17',
			}),
		quantity: Joi.number().required().messages({
			'any.required': '37',
		}),
		message: Joi.string().required().messages({
			'any.required': '39',
		}),
	});
}
