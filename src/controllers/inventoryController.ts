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

export default class materialController implements IController {
	public router = Router();
	public endPoint = '/inventory';
	private materialChanges = materialChangeModel;
	private food = foodModel;
	constructor() {
		this.router.post('', authAdminToken, this.addMaterialChange);

		this.router.patch('/:id', authAdminToken, this.updateMaterialChange);
		this.router.put('/:id', authAdminToken, this.updateMaterialChange);
		this.router.delete('/:id', authAdminToken, this.deleteMaterialChange);

		this.router.get('', authAdminToken, this.getChanges);
	}

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
					const oldMaterialChange = await this.materialChanges
						.findOne(
							{ _id: materialChangeId },
							{ _id: 0, name: 1, quantity: 1, message: 1, date: 1 }
						)
						.lean();
					if (oldMaterialChange) {
						Object.keys(inputMaterialChange).forEach((key) => {
							if (inputMaterialChange[key as keyof IMaterialChange] === '') {
								delete inputMaterialChange[key as keyof IMaterialChange];
							}
						});

						const newMaterialChange = {
							...oldMaterialChange,
							...inputMaterialChange,
							_id: oldMaterialChange._id,
						};

						const databaseAnswer = await this.materialChanges.findByIdAndUpdate(
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
			const { field, value, page } = req.query;
			const pageNumber = Number(page) || 1;
			const itemsPerPage = 10;
			const skip = (pageNumber - 1) * itemsPerPage;

			if (field && value) {
				const selectedItems = await this.materialChanges.aggregate([
					{
						$match: {
							[field as string]: value,
						},
					},
					{
						$lookup: {
							from: 'material',
							localField: 'materialId',
							foreignField: 'materialId',
							as: 'material',
						},
					},
					{
						$group: {
							_id: '$materialId',
							quantity: { $sum: '$quantity' },
							materialId: { $first: '$materialId' },
						},
					},
					{ $skip: skip },
					{ $limit: itemsPerPage },

					{
						$project: {
							_id: 1,
							materialId: 1,
							quantity: 1,
							message: 1,
							date: 1,
							name: { $arrayElemAt: ['$material.name', 0] },
						},
					},
				]);

				if (selectedItems.length > 0) {
					res.send({
						items: selectedItems,
						pageCount: Math.ceil(
							(await this.materialChanges.find({})).length / itemsPerPage
						),
					});
				} else {
					throw Error('77');
				}
			} else {
				const allItems = await this.materialChanges;
				const selectedItems = await this.materialChanges.aggregate([
					{
						$lookup: {
							from: 'material',
							localField: 'materialId',
							foreignField: '_id',
							as: 'material',
						},
					},
					{
						$group: {
							_id: '$materialId',
							quantity: { $sum: '$quantity' },
							materialId: { $first: '$materialId' },
						},
					},
					{ $skip: skip },
					{ $limit: itemsPerPage },

					{
						$project: {
							_id: 1,
							materialId: 1,
							quantity: 1,
							message: 1,
							date: 1,
							name: { $arrayElemAt: ['$material.name', 0] },
						},
					},
				]);
				if (allItems.length > 0) {
					res.send({
						items: selectedItems,
						pageCount: Math.ceil(
							(await this.materialChanges.find({})).length / itemsPerPage
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

			if (inputMaterial.quantity < 0) {
				const isEnoughMaterial = await this.materialChanges.aggregate([
					{ $group: { _id: '$materialId', count: { $sum: '$quantity' } } },
				]);
				log(isEnoughMaterial);
				log(inputMaterial.materialId + ' ' + inputMaterial.quantity);
				const materialAggregation = await this.materialChanges.aggregate([
					{
						$match: {
							materialId: inputMaterial.materialId,
						},
					},
				]);
				log(materialAggregation);

				if (isEnoughMaterial.length === 0) {
					throw Error('71');
				}
				if (isEnoughMaterial[0].inStock + inputMaterial.quantity <= 0) {
					throw Error('71');
				}
			}
			const databaseAnswer = await this.materialChanges.insertMany([
				inputMaterial,
			]);
			if (databaseAnswer) {
				defaultAnswers.ok(res);
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
		materialId: Joi.string().required().messages({
			'any.required': '',
			'string.empty': '',
		}),
		quantity: Joi.number().required().messages({
			'any.required': '37',
		}),
		message: Joi.string().required().messages({
			'any.required': '39',
		}),
	});
}
