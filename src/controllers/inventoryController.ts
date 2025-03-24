import { Router, Request, Response } from 'express';
import { IController, IMaterial, IMaterialChange } from '../models/models';
import {
	foodModel,
	materialChangeModel,
	materialModel,
} from '../models/mongooseSchema';
import { authAdminToken } from '../services/tokenService';
import defaultAnswers from '../helpers/statusCodeHelper';
import Joi from 'joi';
import languageBasedMessage from '../helpers/languageHelper';

import { Types } from 'mongoose';

export default class inventoryController implements IController {
	public router = Router();
	public endPoint = '/inventory';
	private materialChanges = materialChangeModel;
	private materials = materialModel;
	constructor() {
		this.router.post('', authAdminToken, this.addMaterialChange);
		this.router.put('/:id', authAdminToken, this.updateMaterialChange);
		this.router.delete('/:id', authAdminToken, this.deleteMaterialChange);
		this.router.get('', authAdminToken, this.getChanges);
	}

	private getChanges = async (req: Request, res: Response) => {
		try {
			let {
				page = 1,
				limit = 10,
				_id,
				materialId,
				name,
				minQuantity,
				maxQuantity,
				message,
				minDate,
				maxDate,
				fields,
			} = req.query;

			if (isNaN(Number(page)) || isNaN(Number(limit))) {
				throw Error('93');
			}

			const pageNumber = Number(page);
			const itemsPerPage = Number(limit);
			const skip = (pageNumber - 1) * itemsPerPage;
			const allowedFields = [
				'materialId',
				'quantity',
				'message',
				'date',
				'_id',
			];

			const query: any = {};
			if (name) {
				const id = (
					await this.materials.findOne({
						name: new RegExp(name as string, 'i'),
					})
				)?._id;
				if (id) query.materialId = id;
				else throw Error('85');
			}
			if (_id) query._id = new Types.ObjectId(_id as string);
			if (materialId)
				query.materialId = new Types.ObjectId(materialId as string);
			if (message) query.message = new RegExp(message as string, 'i');

			if (minDate && maxDate) {
				let minDateObj = new Date(minDate as string);
				let maxDateObj = new Date(maxDate as string);

				if (minDateObj > maxDateObj) {
					[minDateObj, maxDateObj] = [maxDateObj, minDateObj];
				}

				query.date = {
					$gte: minDateObj,
					$lte: maxDateObj,
				};
			} else if (minDate) {
				query.date = {
					$gte: new Date(minDate as string),
					$lte: new Date(),
				};
			} else if (maxDate) {
				query.date = {
					$gte: new Date('2000-01-01T00:00:00.000Z'),
					$lte: new Date(maxDate as string),
				};
			}

			if (minQuantity && maxQuantity)
				query.quantity = {
					$gte: Number(minQuantity),
					$lte: Number(maxQuantity),
				};
			else if (minQuantity)
				query.quantity = {
					$gte: Number(minQuantity),
				};
			else if (maxQuantity)
				query.quantity = {
					$lte: Number(maxQuantity),
				};

			let projection: any = { _id: 1 };

			if (typeof fields === 'string') {
				fields = [fields];
			}

			if (fields) {
				(fields as string[]).forEach((field) => {
					if (allowedFields.includes(field)) {
						projection[field] = 1;
					}
				});
			} else {
				projection = {
					_id: 1,
					materialId: 1,
					quantity: 1,
					message: 1,
					date: 1,
				};
			}

			const materialChanges =
				await this.materialChanges.aggregate<IMaterialChange>([
					{ $match: query },
					{ $project: projection },
					{ $skip: skip },
					{ $limit: itemsPerPage },
				]);
			if (materialChanges.length > 0) {
				res.send({
					items: materialChanges,
					pageCount: Math.ceil(
						(await this.materialChanges.countDocuments(query)) / itemsPerPage
					),
				});
			} else {
				throw Error('77');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
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
				languageBasedMessage.getError(req, error.message)
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
				languageBasedMessage.getError(req, error.message)
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
							materialId: new Types.ObjectId(
								inputMaterial.materialId!.toString()
							),
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
				languageBasedMessage.getError(req, error.message)
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
