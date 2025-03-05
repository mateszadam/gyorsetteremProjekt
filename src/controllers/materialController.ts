import { Router, Request, Response } from 'express';
import { IController, IMaterial, IMaterialChange } from '../models/models';
import { materialChangeModel, materialModel } from '../models/mongooseSchema';
import { authAdminToken } from '../services/tokenService';
import defaultAnswers from '../helpers/statusCodeHelper';

import Joi, { boolean } from 'joi';
import languageBasedErrorMessage from '../helpers/languageHelper';
import { Types } from 'mongoose';
import { log } from 'console';

export default class materialController implements IController {
	public router = Router();
	private material = materialModel;
	private materialChange = materialChangeModel;
	public endPoint = '/material';

	constructor() {
		this.router.post('', authAdminToken, this.add);
		this.router.get('', authAdminToken, this.getAll);
		this.router.delete('/:id', authAdminToken, this.deleteOneById);
		this.router.put('/:id', authAdminToken, this.updateByMaterialId);
	}

	private add = async (req: Request, res: Response) => {
		try {
			const newMaterial: IMaterial = req.body;
			await this.materialConstraints.validateAsync(newMaterial);

			if (
				await this.material.findOne({
					name: newMaterial.name.toLowerCase(),
				})
			) {
				throw Error('87');
			}

			const response = await this.material.insertMany([newMaterial], {
				rawResult: true,
			});
			if (response.insertedCount > 0) {
				defaultAnswers.ok(
					res,
					await this.material.findById(response.insertedIds[0])
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
	private getAll = async (req: Request, res: Response) => {
		try {
			let {
				page = 1,
				limit = 10,
				_id,
				englishName,
				unit,
				name,
				fields,
				minInStock,
				maxInStock,
				usageOneWeekAgo = 0,
				isEnough,
			} = req.query;

			if (isNaN(Number(page)) || isNaN(Number(limit))) {
				throw Error('93');
			}

			const pageNumber = Number(page);
			const itemsPerPage = Number(limit);
			const skip = (pageNumber - 1) * itemsPerPage;
			const allowedFields = ['_id', 'englishName', 'unit', 'name'];

			const query: any = {};

			if (_id) query._id = new Types.ObjectId(_id as string);
			if (englishName)
				query.englishName = new RegExp(englishName as string, 'i');
			if (unit) query.unit = new RegExp(unit as string, 'i');
			if (name) query.name = new RegExp(name as string, 'i');
			if (minInStock) query.inStock = { $gte: Number(minInStock) };
			if (maxInStock) query.inStock = { $lte: Number(maxInStock) };

			log(query);
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
					name: 1,
					englishName: 1,
					unit: 1,
					inStock: 1,
				};
			}

			const materialChanges: IMaterialChange[] | null =
				await this.material.aggregate([
					{
						$lookup: {
							from: 'materialChanges',
							localField: '_id',
							foreignField: 'materialId',
							as: 'materialChanges',
						},
					},
					{
						$unwind: {
							path: '$materialChanges',
							preserveNullAndEmptyArrays: true,
						},
					},
					{
						$group: {
							_id: '$_id',
							name: { $first: '$name' },
							englishName: { $first: '$englishName' },
							unit: { $first: '$unit' },
							materialId: { $first: '$materialChanges.materialId' },
							inStock: {
								$sum: '$materialChanges.quantity',
							},
						},
					},
					{ $match: query },
					{ $project: projection },
					{ $skip: skip },
					{ $limit: itemsPerPage },
				]);
			if (!materialChanges) {
				throw Error('77');
			}

			const itemsWithUsage = [];
			const requiredDate = new Date();
			requiredDate.setDate(requiredDate.getDate() - 7);
			for (let i = 0; i < materialChanges.length; i++) {
				let usage = 0;
				if (
					(fields && (fields as string[]).includes('usageOneWeekAgo')) ||
					(fields && (fields as string[]).includes('isEnough')) ||
					fields == undefined
				) {
					const usageLastWeek: IMaterialChange[] | null =
						await this.materialChange.find({
							materialId: materialChanges[i]._id,
							quantity: { $lt: 0 },
							date: {
								$gte: new Date(requiredDate.setHours(0, 0, 0, 0)).toISOString(),
								$lt: new Date(
									requiredDate.setHours(23, 59, 59, 999)
								).toISOString(),
							},
						});
					usage = usageLastWeek.reduce((acc, item) => acc + item.quantity, 0);
				}
				if (usage >= Number(usageOneWeekAgo)) {
					if (
						isEnough == undefined ||
						(isEnough as string) ===
							(materialChanges[i].inStock! - usage > 10).toString()
					) {
						if (fields == undefined) {
							itemsWithUsage.push({
								...materialChanges[i],
								isEnough: materialChanges[i].inStock! - usage > 10,
								usageOneWeekAgo: usage,
							});
						} else if ((fields as string[]).includes('usageOneWeekAgo')) {
							itemsWithUsage.push({
								...materialChanges[i],
								usageOneWeekAgo: usage,
							});
						} else if ((fields as string[]).includes('isEnough')) {
							itemsWithUsage.push({
								...materialChanges[i],
								isEnough: materialChanges[i].inStock! - usage > 10,
							});
						} else {
							itemsWithUsage.push({
								...materialChanges[i],
							});
						}
					}
				}
			}

			if (itemsWithUsage.length > 0) {
				res.send({
					items: itemsWithUsage,
					pageCount: Math.ceil(
						(await this.material.countDocuments(query)) / itemsPerPage
					),
				});
			} else {
				throw Error('77');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};

	private deleteOneById = async (req: Request, res: Response) => {
		try {
			const id = req.params.id;

			if (id) {
				await materialChangeModel.deleteMany({ materialId: id });
				const response = await this.material.findByIdAndDelete(id);
				if (response) {
					defaultAnswers.ok(res, response);
				} else {
					throw Error('02');
				}
			} else {
				throw Error('42');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};

	private updateByMaterialId = async (req: Request, res: Response) => {
		try {
			const id = req.params.id;
			const incomingMaterial: IMaterial = req.body;
			if (id) {
				if (incomingMaterial && Object.keys(incomingMaterial).length !== 0) {
					let oldMaterial: IMaterial | null = await this.material.findById(id);
					if (!oldMaterial) {
						throw Error('06');
					}
					delete incomingMaterial._id;
					const mergedMaterial: IMaterial = {
						...(oldMaterial = { ...incomingMaterial, _id: oldMaterial._id }),
					};

					if (mergedMaterial) {
						const response = await this.material.findByIdAndUpdate(
							id,
							mergedMaterial
						);
						if (response) {
							defaultAnswers.ok(
								res,
								await this.material.findById(oldMaterial._id)
							);
						} else {
							throw Error('02');
						}
					} else {
						throw Error('00');
					}
				} else {
					throw Error('90');
				}
			} else {
				throw Error('42');
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
		englishName: Joi.string()
			.pattern(/^[a-zA-ZáéiíoóöőuúüűÁÉIÍOÓÖŐUÚÜŰä0-9 ]+$/)
			.required()
			.messages({
				'string.pattern.base': '19',
				'any.required': '17',
			}),
		unit: Joi.string().required().messages({
			'any.required': '32',
			'string.empty': '32',
		}),
	});
}
