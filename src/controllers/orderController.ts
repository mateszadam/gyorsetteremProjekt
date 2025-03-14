import { Router, Request, Response } from 'express';
import { IController, IFood, IOrder } from '../models/models';
import {
	foodModel,
	materialChangeModel,
	materialModel,
	orderModel,
	userModel,
} from '../models/mongooseSchema';
import {
	authSalesmanToken,
	authKitchenToken,
	authToken,
	authAdminToken,
} from '../services/tokenService';
import defaultAnswers from '../helpers/statusCodeHelper';
import { log } from 'console';
import webSocetController from './websocketController';
import Joi from 'joi';
import languageBasedErrorMessage from '../helpers/languageHelper';
import mongoose, { ObjectId } from 'mongoose';

export default class orderController implements IController {
	public router = Router();
	public endPoint = '/order';
	private order = orderModel;
	private user = userModel;
	private materialChanges = materialChangeModel;
	private material = materialModel;
	private food = foodModel;

	constructor() {
		this.router.post('', authToken, this.newOrder);

		this.router.get('/salesman', authSalesmanToken, this.getAllOngoingOrder);
		this.router.get('/kitchen', authKitchenToken, this.getAllForKitchen);
		this.router.get('/display', this.getOrdersForDisplay);

		this.router.patch('/finish/:id', authKitchenToken, this.kitchenFinishOrder);
		this.router.patch('/handover/:id', authSalesmanToken, this.receivedOrder);

		this.router.patch(
			'/revert/finish/:id',
			authKitchenToken,
			this.revertKitchenFinishOrder
		);
		this.router.patch(
			'/revert/handover/:id',
			authSalesmanToken,
			this.revertReceivedOrder
		);

		this.router.get('', authAdminToken, this.getAllByPage);
	}

	private getOrdersForDisplay = async (req: Request, res: Response) => {
		try {
			const order = await this.order
				.find(
					{
						finishedTime: null,
					},
					{ _id: 0, finishedCokingTime: 1, orderNumber: 1 }
				)
				.sort({ orderedTime: 1 });

			if (order) {
				res.json(order);
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

	// https://javascripttricks.com/implementing-transactional-queries-in-mongoose-70c431dd47e9
	private newOrder = async (req: Request, res: Response) => {
		let newOrderId: ObjectId | null = null;
		const newOrder = req.body as IOrder;
		let newId: ObjectId | null = null;
		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			await this.orderConstraints.validateAsync(newOrder);
			const user = await this.user.findById(newOrder.costumerId);
			if (user) {
				const newOrderNumber = await this.getNewOrderNumber();
				newOrder.orderNumber = newOrderNumber;

				let totalPrice = 0;
				for (let i = 0; i < newOrder.orderedProducts.length; i++) {
					const food: IFood | null = await this.food.findById(
						newOrder.orderedProducts[i]._id
					);
					if (food) {
						totalPrice += food.price * newOrder.orderedProducts[i].quantity;
					} else {
						throw Error('91');
					}
				}
				newOrder.totalPrice = totalPrice;
				const response = await this.order.insertMany([newOrder], {
					session,
					rawResult: true,
				});

				newId = response.insertedIds[0];

				if (response) {
					// Check if there is enough material

					for (let i = 0; i < newOrder.orderedProducts.length; i++) {
						const food: IFood | null = await this.food.findById(
							newOrder.orderedProducts[i]._id
						);
						if (food) {
							for (let j = 0; j < food.materials.length; j++) {
								const material = await this.material.findById(
									food.materials[j]._id
								);

								if (material) {
									const materialChange = await this.materialChanges.aggregate([
										{
											$match: {
												materialId: material._id,
											},
										},
										{
											$group: {
												_id: '$materialId',
												inStock: { $sum: '$quantity' },
											},
										},
									]);
									if (materialChange.length === 0) {
										throw Error('71');
									}
									if (
										materialChange[0].inStock -
											food.materials[j].quantity *
												newOrder.orderedProducts[i].quantity <
										0
									) {
										throw Error('71');
									}

									await this.materialChanges.insertMany(
										[
											{
												materialId: material._id,
												quantity: -(
													food.materials[j].quantity *
													newOrder.orderedProducts[i].quantity
												),
												message: 'Order',
											},
										],
										{ session }
									);
								} else {
									throw Error('85');
								}
							}
						} else {
							throw Error('81');
						}
					}
				} else {
					throw Error('02');
				}
			} else {
				throw Error('06');
			}
			await session.commitTransaction();
			session.endSession();
			const newOrderToSend: IOrder | null = await this.order.findById(newId);
			webSocetController.sendStateChangeToKitchen(newOrderToSend!);
			defaultAnswers.created(res, newOrderToSend!);
		} catch (error: any) {
			await session.abortTransaction();
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};

	private getAllOngoingOrder = async (req: Request, res: Response) => {
		try {
			const order = await this.order
				.find(
					{
						$and: [
							{ finishedTime: null },
							{ finishedCokingTime: { $ne: null } },
						],
					},
					{ 'orderedProducts._id': 0 }
				)
				.sort({ orderedTime: -1 });

			if (order) {
				res.json(order);
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

	private getAllForKitchen = async (req: Request, res: Response) => {
		try {
			const order = await this.order
				.find(
					{
						finishedCokingTime: null,
					},
					{ 'orderedProducts._id': 0 }
				)
				.sort({ orderedTime: 1 });
			if (order) {
				res.json(order);
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

	private kitchenFinishOrder = async (req: Request, res: Response) => {
		try {
			const id = req.params.id;
			if (id) {
				const order = await this.order.updateOne(
					{
						_id: id,
					},
					{
						$set: { finishedCokingTime: Date.now() },
					}
				);
				if (order.modifiedCount > 0) {
					const newItem: IOrder | null = await this.order.findOne({
						_id: id,
					});
					webSocetController.sendStateChangeToSalesman(newItem!);
					defaultAnswers.ok(res);
				} else {
					throw Error('64');
				}
			} else {
				defaultAnswers.badRequest(res);
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};
	private revertKitchenFinishOrder = async (req: Request, res: Response) => {
		try {
			const id = req.params.id;
			if (id) {
				const order = await this.order.updateOne(
					{
						_id: id,
					},
					{
						$set: { finishedCokingTime: null },
					}
				);
				if (order.modifiedCount > 0) {
					webSocetController.sendStateChange(id);
					defaultAnswers.ok(res);
				} else {
					throw Error('64');
				}
			} else {
				defaultAnswers.badRequest(res);
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};

	private receivedOrder = async (req: Request, res: Response) => {
		try {
			const id = req.params.id;
			if (id) {
				const order = await this.order.updateOne(
					{
						_id: id,
					},
					{
						$set: { finishedTime: Date.now() },
					}
				);
				if (order.modifiedCount > 0) {
					webSocetController.sendStateChange(id);

					defaultAnswers.ok(res);
				} else {
					throw Error('54');
				}
			} else {
				throw Error('54');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};
	private revertReceivedOrder = async (req: Request, res: Response) => {
		try {
			const id = req.params.id;
			if (id) {
				const order = await this.order.updateOne(
					{
						_id: id,
					},

					{
						$set: { finishedTime: null },
					}
				);
				if (order.modifiedCount > 0) {
					webSocetController.sendStateChange(id);

					defaultAnswers.ok(res);
				} else {
					throw Error('54');
				}
			} else {
				throw Error('54');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};

	private getAllByPage = async (req: Request, res: Response) => {
		try {
			const { field, value, page, from, to } = req.query;

			const allowedFields = [
				'_id',
				'costumerId',
				'orderNumber',
				'finishedTime',
				'orderedTime',
				'finishedCokingTime',
				'totalPrice',
			];
			if (field && !allowedFields.includes(field as string)) {
				throw Error('83');
			}

			const pageNumber = Number(page) || 1;
			const itemsPerPage = 10;
			const skip = (pageNumber - 1) * itemsPerPage;

			if (field && value) {
				const selectedItems = await this.order
					.find({ [field as string]: value })
					.skip(skip)
					.limit(itemsPerPage);
				if (selectedItems.length > 0) {
					res.send({
						items: selectedItems,
						pageCount: Math.ceil(
							(await this.order.find({ [field as string]: value })).length /
								itemsPerPage
						),
					});
				} else {
					throw Error('77');
				}
			} else if (from) {
				let toTime;
				if (to == '{to}' || to == '' || !to) {
					const toDate = new Date();
					toDate.setDate(toDate.getDate() + 1);
					toTime = toDate.toJSON().split('T')[0];
				} else {
					toTime = new Date(to as string);
				}
				if (from) {
					const order = await this.order
						.find(
							{
								finishedTime: { $gte: new Date(from as string), $lte: toTime },
							},
							{ 'orderedProducts._id': 0 }
						)
						.sort({ orderedTime: -1 })
						.skip(skip)
						.limit(itemsPerPage);
					if (order) {
						if (order.length > 0) {
							res.send({
								items: order,
								pageCount: Math.ceil(
									(
										await this.order.find({
											finishedTime: {
												$gte: new Date(from as string),
												$lte: toTime,
											},
										})
									).length / itemsPerPage
								),
							});
						} else {
							throw Error('77');
						}
					} else {
						throw Error('02');
					}
				} else {
					throw Error('53');
				}
			} else {
				const allItems = await this.order
					.find({})
					.skip(skip)
					.limit(itemsPerPage);
				if (allItems.length > 0) {
					res.send({
						items: allItems,
						pageCount: Math.ceil(
							(await this.order.find({ [field as string]: value })).length /
								itemsPerPage
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

	private orderConstraints = Joi.object({
		costumerId: Joi.required().messages({
			'any.required': '40',
		}),
		orderedProducts: Joi.array()
			.items(
				Joi.object({
					_id: Joi.string().required().messages({
						'string.base': '34',
						'any.required': '34',
					}),
					quantity: Joi.number().required().messages({
						'number.base': '36',
						'any.required': '37',
					}),
				})
			)
			.required()
			.min(1)
			.messages({
				'array.base': '33',
				'any.required': '33',
				'number.greater': '35',
			}),
	});

	private getNewOrderNumber = async () => {
		const order = await this.order
			.find({ finishedTime: null })
			.sort({ orderNumber: -1 })
			.limit(1)
			.select('orderNumber');
		if (order.length > 0) {
			return Number(order[0].orderNumber) + 1;
		} else {
			return 1000;
		}
	};
}
