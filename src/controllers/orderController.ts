import { Router, Request, Response } from 'express';
import {
	IController,
	IFood,
	IOrder,
	IOrderedProductFull,
	IOrderFull,
	IUser,
} from '../models/models';
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
	getDataFromToken,
} from '../services/tokenService';
import defaultAnswers from '../helpers/statusCodeHelper';
import { log } from 'console';
import webSocketController from './websocketController';
import Joi from 'joi';
import languageBasedMessage from '../helpers/languageHelper';

import mongoose, { ObjectId, Types } from 'mongoose';

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

		this.router.get('', authToken, this.getAllByPage);
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
				languageBasedMessage.getError(req, error.message)
			);
		}
	};

	private newOrder = async (req: Request, res: Response) => {
		let newOrderId: ObjectId | null = null;
		const newOrder = req.body as IOrder;
		let newId: ObjectId | null = null;
		const session = await mongoose.startSession();
		session.startTransaction();
		try {
			await this.orderConstraints.validateAsync(newOrder);
			newOrder.orderedTime = new Date();

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
			const newOrderResponse: IOrderedProductFull = await this.getOrderDetails(
				new Types.ObjectId(`${newId}`)
			);
			webSocketController.sendStateChangeToKitchen(newOrderResponse);
			defaultAnswers.created(res, newOrderResponse);
		} catch (error: any) {
			await session.abortTransaction();
			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
			);
		}
	};

	private getAllOngoingOrder = async (req: Request, res: Response) => {
		try {
			const orders = await this.order.aggregate<IOrderFull>([
				{
					$match: {
						$and: [
							{ finishedTime: null },
							{ finishedCokingTime: { $ne: null } },
						],
					},
				},

				{
					$lookup: {
						from: 'foods',
						localField: 'orderedProducts._id',
						foreignField: '_id',
						as: 'foodDetails',
					},
				},
				{
					$addFields: {
						orderedProducts: {
							$map: {
								input: '$orderedProducts',
								as: 'orderItem',
								in: {
									_id: '$$orderItem._id',
									quantity: '$$orderItem.quantity',
									details: {
										$arrayElemAt: [
											{
												$filter: {
													input: '$foodDetails',
													as: 'food',
													cond: { $eq: ['$$food._id', '$$orderItem._id'] },
												},
											},
											0,
										],
									},
								},
							},
						},
					},
				},
				{
					$project: {
						foodDetails: 0,
						'orderedProducts._id': 0,
						'orderedProducts.details._id': 0,
					},
				},
				{
					$sort: { orderedTime: 1 },
				},
			]);
			res.json(languageBasedMessage.getLangageBasedNameFormOrder(req, orders));
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
			);
		}
	};

	private getAllForKitchen = async (req: Request, res: Response) => {
		try {
			const orders = await this.order.aggregate([
				{
					$match: {
						$and: [{ finishedTime: null }, { finishedCokingTime: null }],
					},
				},
				{
					$lookup: {
						from: 'foods',
						localField: 'orderedProducts._id',
						foreignField: '_id',
						as: 'foodDetails',
					},
				},
				{
					$addFields: {
						orderedProducts: {
							$map: {
								input: '$orderedProducts',
								as: 'orderItem',
								in: {
									_id: '$$orderItem._id',
									quantity: '$$orderItem.quantity',
									details: {
										$arrayElemAt: [
											{
												$filter: {
													input: '$foodDetails',
													as: 'food',
													cond: { $eq: ['$$food._id', '$$orderItem._id'] },
												},
											},
											0,
										],
									},
								},
							},
						},
					},
				},
				{
					$project: {
						foodDetails: 0,
						'orderedProducts._id': 0,
						'orderedProducts.details._id': 0,
					},
				},
				{
					$sort: { orderedTime: 1 },
				},
			]);

			res.json(languageBasedMessage.getLangageBasedNameFormOrder(req, orders));
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
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
						$set: {
							finishedCokingTime: new Date(),
						},
					}
				);
				if (order.modifiedCount > 0) {
					webSocketController.sendStateChangeToSalesman(
						await this.getOrderDetails(new Types.ObjectId(id))
					);
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
				languageBasedMessage.getError(req, error.message)
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
						$set: { finishedCokingTime: null, finishedTime: null },
					}
				);
				if (order.matchedCount > 0) {
					webSocketController.sendStateChangeToAll(
						await this.getOrderDetails(new Types.ObjectId(id))
					);
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
				languageBasedMessage.getError(req, error.message)
			);
		}
	};

	private receivedOrder = async (req: Request, res: Response) => {
		try {
			const id = req.params.id;
			const finistTimeISO = new Date();
			if (id) {
				const order = await this.order.updateOne(
					{
						_id: id,
					},
					{
						$set: { finishedTime: finistTimeISO },
					}
				);
				if (order.modifiedCount > 0) {
					webSocketController.sendStateChangeToDisplay(
						await this.getOrderDetails(new Types.ObjectId(id))
					);

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
				languageBasedMessage.getError(req, error.message)
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
				if (order.matchedCount > 0) {
					webSocketController.sendStateChangeToAll(
						await this.getOrderDetails(new Types.ObjectId(id))
					);
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
				languageBasedMessage.getError(req, error.message)
			);
		}
	};

	private getAllByPage = async (req: Request, res: Response) => {
		try {
			let {
				page = 1,
				limit = 10,
				_id,
				costumerId,
				minTotalPrice,
				maxTotalPrice,
				minOrderedTime,
				maxOrderedTime,
				minFinishedTime,
				maxFinishedTime,
				minFinishedCokingTime,
				maxFinishedCokingTime,
				fields,
			} = req.query;

			const data = getDataFromToken(
				req.headers.authorization?.replace('Bearer ', '')!
			);

			const user: IUser | null = await this.user.findById(data?._id);
			if (
				user?.role == 'admin' &&
				costumerId &&
				costumerId.toString() != user?._id.toString()
			) {
				throw Error('94');
			}

			if (isNaN(Number(page)) || isNaN(Number(limit))) {
				throw Error('93');
			}

			const pageNumber = Number(page);
			const itemsPerPage = Number(limit);
			const skip = (pageNumber - 1) * itemsPerPage;
			const allowedFields = [
				'_id',
				'costumerId',
				'orderNumber',
				'finishedTime',
				'orderedTime',
				'finishedCokingTime',
				'totalPrice',
				'orderedProducts',
			];

			const query: any = {};

			if (_id) query._id = new mongoose.Types.ObjectId(_id as string);
			if (costumerId)
				query.costumerId = new mongoose.Types.ObjectId(costumerId as string);

			if (minTotalPrice && maxTotalPrice) {
				query.totalPrice = {
					$gte: Number(minTotalPrice),
					$lte: Number(maxTotalPrice),
				};
			} else if (minTotalPrice) {
				query.totalPrice = { $gte: Number(minTotalPrice) };
			} else if (maxTotalPrice) {
				query.totalPrice = { $lte: Number(maxTotalPrice) };
			}

			if (minOrderedTime && maxOrderedTime) {
				let minDate = new Date(minOrderedTime as string);
				let maxDate = new Date(maxOrderedTime as string);

				if (minDate > maxDate) {
					[minDate, maxDate] = [maxDate, minDate];
				}

				query.orderedTime = {
					$gte: minDate,
					$lte: maxDate,
				};
			} else if (minOrderedTime) {
				query.orderedTime = {
					$gte: new Date(minOrderedTime as string),
				};
			} else if (maxOrderedTime) {
				query.orderedTime = {
					$lte: new Date(maxOrderedTime as string),
				};
			}

			if (minFinishedTime && maxFinishedTime) {
				let minDate = new Date(minFinishedTime as string);
				let maxDate = new Date(maxFinishedTime as string);

				if (minDate > maxDate) {
					[minDate, maxDate] = [maxDate, minDate];
				}

				query.finishedTime = {
					$gte: minDate,
					$lte: maxDate,
				};
			} else if (minFinishedTime) {
				query.finishedTime = {
					$gte: new Date(minFinishedTime as string),
				};
			} else if (maxFinishedTime) {
				query.finishedTime = {
					$lte: new Date(maxFinishedTime as string),
				};
			}

			if (minFinishedCokingTime && maxFinishedCokingTime) {
				let minDate = new Date(minFinishedCokingTime as string);
				let maxDate = new Date(maxFinishedCokingTime as string);

				if (minDate > maxDate) {
					[minDate, maxDate] = [maxDate, minDate];
				}

				query.finishedCokingTime = {
					$gte: minDate,
					$lte: maxDate,
				};
			} else if (minFinishedCokingTime) {
				query.finishedCokingTime = {
					$gte: new Date(minFinishedCokingTime as string),
				};
			} else if (maxFinishedCokingTime) {
				query.finishedCokingTime = {
					$lte: new Date(maxFinishedCokingTime as string),
				};
			}

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
					costumerId: 1,
					orderNumber: 1,
					finishedTime: 1,
					orderedTime: 1,
					finishedCokingTime: 1,
					totalPrice: 1,
					orderedProducts: 1,
				};
			}

			const orders = await this.order.aggregate<IOrderFull>([
				{ $match: query },
				{ $project: projection },
				{
					$sort: { orderedTime: -1 },
				},
				{ $skip: skip },
				{ $limit: itemsPerPage },
				{
					$lookup: {
						from: 'foods',
						localField: 'orderedProducts._id',
						foreignField: '_id',
						as: 'foodDetails',
					},
				},
				{
					$addFields: {
						orderedProducts: {
							$map: {
								input: '$orderedProducts',
								as: 'orderItem',
								in: {
									_id: '$$orderItem._id',
									quantity: '$$orderItem.quantity',
									details: {
										$arrayElemAt: [
											{
												$filter: {
													input: '$foodDetails',
													as: 'food',
													cond: { $eq: ['$$food._id', '$$orderItem._id'] },
												},
											},
											0,
										],
									},
								},
							},
						},
					},
				},
				{
					$project: {
						foodDetails: 0,
						'orderedProducts._id': 0,
						'orderedProducts.details._id': 0,
					},
				},
			]);
			res.send({
				items: languageBasedMessage.getLangageBasedNameFormOrder(req, orders),
				pageCount: Math.ceil(
					(await this.order.countDocuments(query)) / itemsPerPage
				),
			});
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
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
		const result = await this.order.aggregate([
			{ $match: { finishedTime: null } },
			{ $group: { _id: null, maxOrderNumber: { $max: '$orderNumber' } } },
		]);
		if (result.length > 0 && result[0].maxOrderNumber) {
			return result[0].maxOrderNumber + 1;
		} else {
			return 1000;
		}
	};
	private async getOrderDetails(
		_id: Types.ObjectId
	): Promise<IOrderedProductFull> {
		return (
			await this.order.aggregate([
				{
					$match: {
						_id: _id,
					},
				},
				{
					$lookup: {
						from: 'foods',
						localField: 'orderedProducts._id',
						foreignField: '_id',
						as: 'foodDetails',
					},
				},
				{
					$addFields: {
						orderedProducts: {
							$map: {
								input: '$orderedProducts',
								as: 'orderItem',
								in: {
									_id: '$$orderItem._id',
									quantity: '$$orderItem.quantity',
									details: {
										$arrayElemAt: [
											{
												$filter: {
													input: '$foodDetails',
													as: 'food',
													cond: { $eq: ['$$food._id', '$$orderItem._id'] },
												},
											},
											0,
										],
									},
								},
							},
						},
					},
				},
				{
					$project: {
						foodDetails: 0,
						'orderedProducts._id': 0,
						'orderedProducts.details._id': 0,
					},
				},
			])
		)[0];
	}
}
