import { Router, Request, Response } from 'express';
import { IController, IMaterial } from '../models/models';
import { materialChangeModel, materialModel } from '../models/mongooseSchema';
import { authAdminToken } from '../services/tokenService';
import defaultAnswers from '../helpers/statusCodeHelper';

import Joi from 'joi';
import languageBasedErrorMessage from '../helpers/languageHelper';
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
		this.router.patch('/:id', authAdminToken, this.updateByMaterialId);
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
			const { field, value, page } = req.query;
			const pageNumber = Number(page) || 1;
			const itemsPerPage = 10;
			const skip = (pageNumber - 1) * itemsPerPage;

			if (field && value) {
				const selectedItems = await this.material
					.find({ [field as string]: value })
					.skip(skip)
					.limit(itemsPerPage);
				if (selectedItems.length > 0) {
					res.send({
						items: selectedItems,
						pageCount: Math.ceil(
							(await this.material.find({ [field as string]: value })).length /
								itemsPerPage
						),
					});
				} else {
					throw Error('77');
				}
			} else {
				const allItems = await this.material
					.find({})
					.skip(skip)
					.limit(itemsPerPage);
				if (allItems.length > 0) {
					res.send({
						items: allItems,
						pageCount: Math.ceil(
							(await this.material.countDocuments({})) / itemsPerPage
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
				if (incomingMaterial) {
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
						throw Error('');
					}
				} else {
					throw Error('32');
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
