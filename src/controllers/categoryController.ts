import e, { Router, Request, Response } from 'express';
import { ICategory, IController } from '../models/models';
import { categoryModel } from '../models/mongooseSchema';
import { authAdminToken, authToken } from '../services/tokenService';
import defaultAnswers from '../helpers/statusCodeHelper';

import Joi from 'joi';
import languageBasedErrorMessage from '../helpers/languageHelper';
import { log } from 'console';
import mongoose from 'mongoose';
export default class categoryController implements IController {
	public router = Router();
	private category = categoryModel;
	public endPoint = '/category';

	constructor() {
		this.router.post('', authAdminToken, this.add);
		this.router.delete('/:id', authAdminToken, this.deleteOne);
		this.router.put('/:id', authAdminToken, this.modifyOne);
		this.router.get('', authToken, this.filterCategory);
	}

	private filterCategory = async (req: Request, res: Response) => {
		try {
			const { field, value, page } = req.query;

			const allowedFields = ['_id', 'name', 'englishName'];
			if (field && !allowedFields.includes(field as string)) {
				throw Error('83');
			}

			const pageNumber = Number(page) || 1;
			const itemsPerPage = 10;
			const skip = (pageNumber - 1) * itemsPerPage;

			if (field && value) {
				const selectedItems = await this.category
					.find({ [field as string]: value })
					.skip(skip)
					.limit(itemsPerPage);
				if (selectedItems.length > 0) {
					res.send({
						items: selectedItems,
						pageCount: Math.ceil(
							(await this.category.find({ [field as string]: value })).length /
								itemsPerPage
						),
					});
				} else {
					throw Error('77');
				}
			} else {
				const allItems = await this.category
					.find({})
					.skip(skip)
					.limit(itemsPerPage);
				if (allItems.length > 0) {
					res.send({
						items: allItems,
						pageCount: Math.ceil(
							(await this.category.countDocuments()) / itemsPerPage
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

	private add = async (req: Request, res: Response) => {
		try {
			const newCategory: ICategory = req.body;
			await this.categoryConstraints.validateAsync(newCategory);
			if ((await this.category.find({ name: newCategory.name })).length === 0) {
				const response = await this.category.insertMany([newCategory], {
					rawResult: true,
				});

				if (response) {
					defaultAnswers.ok(
						res,
						await this.category.findOne({ _id: response.insertedIds[0] })
					);
				} else {
					throw Error('02');
				}
			} else {
				throw Error('75');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};
	private deleteOne = async (req: Request, res: Response) => {
		try {
			const id = req.params.id;
			if (id) {
				const response = await this.category.deleteOne({ _id: id });
				if (response.deletedCount > 0) {
					defaultAnswers.ok(res);
				} else {
					throw Error('43');
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
	private modifyOne = async (req: Request, res: Response) => {
		try {
			const inputCategory: ICategory = req.body;
			const id = req.params.id;
			await this.categoryConstraints.validateAsync(inputCategory);
			if (id) {
				const response = await this.category.find({
					$and: [{ name: inputCategory.name }, { _id: { $ne: id } }],
				});

				if (response.length === 0) {
					const response = await this.category.updateOne(
						{ _id: id },
						{
							$set: {
								name: inputCategory.name,
								icon: inputCategory.icon,
								englishName: inputCategory.englishName,
							},
						}
					);
					if (response.matchedCount > 0) {
						defaultAnswers.ok(res, await this.category.findOne({ _id: id }));
					} else {
						throw Error('44');
					}
				} else {
					throw Error('75');
				}
			} else {
				throw Error('07');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};

	private categoryConstraints = Joi.object({
		name: Joi.string()
			.min(2)
			.max(30)
			.pattern(/^[a-zA-ZáéiíoóöőuúüűÁÉIÍOÓÖŐUÚÜŰä0-9 ]+$/)
			.required()
			.messages({
				'any.required': '17',
				'string.empty': '17',
				'string.min': '09',
				'string.max': '09',
				'string.pattern.base': '19',
			}),
		icon: Joi.string()
			.required()
			.messages({ 'string.empty': '20', 'any.required': '20' }),
		englishName: Joi.string()
			.required()
			.messages({
				'string.empty': '78',
				'string.pattern.base': '78',
				'any.required': '78',
			}),
	});
}
