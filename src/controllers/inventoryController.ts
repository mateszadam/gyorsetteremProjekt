import { Router, Request, Response } from 'express';
import { IController, IMaterial, IMaterialChange } from '../models/models';
import {
	foodModel,
	materialChangeModel,
	materialModel,
} from '../models/mongooseSchema';
import { authAdminToken, authToken } from '../services/tokenService';
import defaultAnswers from '../helpers/statusCodeHelper';
import Joi from 'joi';
import languageBasedErrorMessage from '../helpers/languageHelper';
import { log } from 'console';
import { Mongoose, ObjectId } from 'mongoose';
import { Schema } from 'mongoose';

export default class inventoryController implements IController {
	public router = Router();
	public endPoint = '/inventory';
	private materialChanges = materialChangeModel;
	private materials = materialModel;
	constructor() {
		this.router.post('', authAdminToken, this.addMaterialChange);

		this.router.patch('/:id', authAdminToken, this.updateMaterialChange);
		this.router.put('/:id', authAdminToken, this.updateMaterialChange);
		this.router.delete('/:id', authAdminToken, this.deleteMaterialChange);

		this.router.get('', authAdminToken, this.getStock);
		this.router.get('/changes', authAdminToken, this.getChanges);
	}

	private getChanges = async (req: Request, res: Response) => {
		try {
			const { page = 1, limit = 10, field, value } = req.query;
			const pageNumber = Number(page);
			const itemsPerPage = Number(limit);
			const skip = (pageNumber - 1) * itemsPerPage;

			if (
				field &&
				!['name', 'quantity', 'message', 'date', '_id'].includes(
					field as string
				)
			) {
				throw Error('83');
			}
			const totalItems = await this.materialChanges.countDocuments({
				[field as string]: value,
			});
			const materialChanges = await this.materialChanges
				.find({ [field as string]: value })
				.skip(skip)
				.limit(itemsPerPage);

			res.send({
				items: materialChanges,
				pageCount: Math.ceil(totalItems / itemsPerPage),
			});
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};

	private deleteMaterialChange = async (req: Request, res: Response) => {
		try {
			const materialChangeId = req.params.id;
			if (materialChangeId) {
				const databaseAnswer =
					await this.materialChanges.findByIdAndDelete(materialChangeId);
				if (databaseAnswer) {
					defaultAnswers.ok(res);
				} else {
					throw Error('02');
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

	private updateMaterialChange = async (req: Request, res: Response) => {
		try {
			const materialChangeId = req.params.id;
			const inputMaterialChange: IMaterialChange = req.body;
			if (materialChangeId) {
				if (
					inputMaterialChange.message ||
					inputMaterialChange.quantity ||
					inputMaterialChange.materialId
				) {
					let oldMaterialChange: IMaterialChange | null =
						await this.materialChanges.findOne(
							{ _id: materialChangeId },
							{ _id: 0, name: 1, quantity: 1, message: 1, date: 1 }
						);

					if (oldMaterialChange) {
						Object.keys(inputMaterialChange).forEach((key) => {
							if (inputMaterialChange[key as keyof IMaterialChange] === '') {
								delete inputMaterialChange[key as keyof IMaterialChange];
							}
						});
						const newMaterialChange: IMaterialChange = {
							...(oldMaterialChange = {
								...inputMaterialChange,
								_id: oldMaterialChange._id,
							}),
						};

						const databaseAnswer = await this.materialChanges.findByIdAndUpdate(
							materialChangeId,
							newMaterialChange
						);
						if (databaseAnswer?.isModified) {
							defaultAnswers.ok(
								res,
								await this.materialChanges.findById(materialChangeId)
							);
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

	private getStock = async (req: Request, res: Response) => {
		try {
			const { field, value, page, limit } = req.query;
			const pageNumber = Number(page) || 1;
			const itemsPerPage = Number(limit) || 10;
			const skip = (pageNumber - 1) * itemsPerPage;

			if (field && value) {
				const selectedItems = await this.materials.aggregate([
					{
						$lookup: {
							from: 'materialChanges',
							localField: '_id',
							foreignField: 'materialId',
							as: 'materialChanges',
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
							englishName: 1,
							unit: 1,
							inStock: {
								$sum: '$materialChanges.quantity',
							},
						},
					},
					{ $match: { [field as string]: value } },
					{ $skip: skip },
					{ $limit: itemsPerPage },
				]);

				if (selectedItems.length > 0) {
					res.send({
						items: selectedItems,
						pageCount: Math.ceil(
							(await this.materialChanges.countDocuments()) / itemsPerPage
						),
					});
				} else {
					throw Error('77');
				}
			} else {
				const allItems = await this.materialChanges;

				const selectedItems = await this.materials.aggregate([
					{
						$lookup: {
							from: 'materialChanges',
							localField: '_id',
							foreignField: 'materialId',
							as: 'materialChanges',
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
							englishName: 1,
							unit: 1,
							inStock: {
								$sum: '$materialChanges.quantity',
							},
						},
					},
					{ $skip: skip },
					{ $limit: itemsPerPage },
				]);

				if (allItems.length > 0) {
					res.send({
						items: selectedItems,
						pageCount: Math.ceil(
							(
								await this.materialChanges.aggregate([
									{
										$group: {
											_id: '$materialId',
											quantity: { $sum: '$quantity' },
											materialId: { $first: '$materialId' },
										},
									},
								])
							).length / itemsPerPage
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

	private addMaterialChange = async (req: Request, res: Response) => {
		try {
			const inputMaterial: IMaterialChange = req.body;

			await this.materialChangesConstraints.validateAsync(inputMaterial);

			if (inputMaterial.name) {
				const material: IMaterial | null = await materialModel.findOne({
					name: inputMaterial.name.toLowerCase(),
				});
				if (material && material._id) {
					inputMaterial.materialId = material._id;
				} else {
					throw Error('85');
				}
			}
			delete inputMaterial.name;

			if (inputMaterial.quantity < 0) {
				const isEnoughMaterial = await this.materialChanges.aggregate([
					{
						$match: {
							materialId: inputMaterial.materialId,
						},
					},
					{
						$group: {
							_id: '$materialId',
							inStock: { $sum: '$quantity' },
						},
					},
				]);

				if (isEnoughMaterial.length === 0) {
					throw Error('71');
				}
				if (isEnoughMaterial[0].inStock + inputMaterial.quantity <= 0) {
					throw Error('71');
				}
			}
			const databaseAnswer = await this.materialChanges.insertMany(
				[inputMaterial],
				{ rawResult: true }
			);
			if (databaseAnswer) {
				defaultAnswers.created(
					res,
					await this.materialChanges.findById(databaseAnswer.insertedIds[0])
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

	private getAllMaterialChange = async (req: Request, res: Response) => {
		try {
			const materials = await this.materialChanges.aggregate([
				{
					$group: {
						_id: '$name',
						inStock: { $sum: '$quantity' },
					},
				},
				{
					$lookup: {
						from: 'material',
						localField: '_id',
						foreignField: 'materialId',
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

	private materialChangesConstraints = Joi.object({
		quantity: Joi.number().required().messages({
			'any.required': '37',
		}),
		message: Joi.string().required().messages({
			'any.required': '39',
		}),
		name: Joi.string().messages({
			'any.required': '17',
			'string.empty': '17',
		}),
		materialId: Joi.string().messages({
			'any.required': '17',
			'string.empty': '17',
		}),
	});
}
