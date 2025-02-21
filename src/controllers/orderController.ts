import { Router, Request, Response } from 'express';
import { IController, IFood, IOrder } from '../models/models';
import {
	foodModel,
	materialModel,
	orderModel,
	userModel,
} from '../models/mongooseSchema';
import {
	authKioskToken,
	authKitchenToken,
	authToken,
} from '../services/tokenService';
import defaultAnswers from '../helpers/statusCodeHelper';
import { log } from 'console';
import webSocetController from './websocketController';
import Joi from 'joi';
import languageBasedErrorMessage from '../helpers/languageHelper';
import { ObjectId } from 'mongoose';

export default class orderController implements IController {
	public router = Router();
	public endPoint = '/order';
	private order = orderModel;
	private user = userModel;
	private material = materialModel;
	private food = foodModel;

	constructor() {
		this.router.post('/new', authToken, this.newOrder);

		this.router.get('/ongoing', authKioskToken, this.getAllOngoingOrder);
		this.router.get('/ongoing/:id', authToken, this.getOngoingById);
		this.router.get('/finished/:id', authToken, this.getFinishedById);
		this.router.get('/time/:from/:to', authToken, this.getAllOrder);
		this.router.get('/kitchen', authKitchenToken, this.getAllForKitchen);
		this.router.get('/all/:id', authToken, this.getById);

		this.router.patch('/finish/:id', authKitchenToken, this.kitchenFinishOrder);
		this.router.patch('/handover/:id', authKioskToken, this.receivedOrder);
		this.router.get('/page/:number', authKioskToken, this.getAllByPage);
	}

	// https://javascripttricks.com/implementing-transactional-queries-in-mongoose-70c431dd47e9
	private newOrder = async (req: Request, res: Response) => {
		try {
			const newOrder: IOrder = req.body;
			await this.orderConstraints.validateAsync(newOrder);

			const userExists = await this.user.find({
				_id: newOrder.costumerId,
			});
			if (userExists.length > 0) {
				newOrder.orderNumber = await this.getNewOrderNumber();
				const insertedOrders = await this.order.insertMany([newOrder], {
					rawResult: true,
				});
				const newOrderId = insertedOrders.insertedIds[0];
				if (insertedOrders.acknowledged) {
					const newOrderId = insertedOrders.insertedIds[0];

					if (newOrderId) {
						for (
							let index = 0;
							index < newOrder.orderedProducts.length;
							index++
						) {
							const orderedProducts = newOrder.orderedProducts[index];

							const orderedFood: IFood | null = await this.food.findOne({
								name: orderedProducts.name,
							});
							const materialsInStock = await this.material
								.aggregate([
									{
										$group: {
											_id: '$name',
											inStock: { $sum: '$quantity' },
										},
									},
								])
								.then((result) => {
									const stock: { [key: string]: number } = {};
									result.forEach((item: any) => {
										stock[item._id] = item.inStock;
									});
									return stock;
								});
							if (orderedFood) {
								for (
									let index = 0;
									index < orderedFood.materials.length;
									index++
								) {
									const orderedFoodMaterials = orderedFood.materials[index];
									const materialChange = {
										name: orderedFoodMaterials.name,
										quantity:
											0 -
											orderedFoodMaterials.quantity * orderedProducts.quantity,
										message: 'Rendelés ' + newOrderId,
									};
									if (
										materialsInStock[orderedFoodMaterials.name] >=
										orderedFoodMaterials.quantity * orderedProducts.quantity
									) {
										await this.material.insertMany([materialChange]);
									} else {
										await this.material.deleteMany({
											message: { $regex: newOrderId },
										});
										await this.order.deleteOne({ _id: newOrderId });
										throw Error('56');
									}
								}
							} else {
								throw Error('51');
							}
						}
					} else {
						throw Error('02');
					}
				} else {
					throw Error('06');
				}

				webSocetController.sendStateChange('');
				defaultAnswers.created(res, {
					orderId: newOrderId,
					orderNumber: newOrder.orderNumber,
				});
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

	private getById = async (req: Request, res: Response) => {
		try {
			const id = req.params.id;
			if (id) {
				const order = await this.order
					.find(
						{
							costumerId: id,
						},
						{ 'orderedProducts._id': 0 }
					)
					.sort({ orderedTime: -1 });
				if (order.length > 0) {
					res.json(order);
				} else {
					throw Error('06');
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
	private getAllOngoingOrder = async (req: Request, res: Response) => {
		try {

			const order = await this.order
				.find({ finishedTime: null }, { 'orderedProducts._id': 0 })
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

	private getOngoingById = async (req: Request, res: Response) => {
		try {
			const id = req.params.id;
			if (id) {
				const order = await this.order
					.find(
						{
							costumerId: id,
							isFinished: false,
						},
						{ 'orderedProducts._id': 0 }
					)
					.sort({ orderedTime: -1 });
				if (order) {
					res.json(order);
				} else {
					throw Error('02');
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

	private getFinishedById = async (req: Request, res: Response) => {
		try {
			const id = req.params.id;
			if (id) {
				const order = await this.order
					.find(
						{
							costumerId: id,
							finishedTime: { $ne: null },
						},
						{ 'orderedProducts._id': 0 }
					)
					.sort({ orderedTime: -1 });
				if (order) {
					res.json(order);
				} else {
					throw Error('02');
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
	private getAllOrder = async (req: Request, res: Response) => {
		try {
			const from: string = req.params.from;
			let to: string = req.params.to;
			if (to == '{to}' || to == '' || !to) {
				const toDate = new Date();
				toDate.setDate(toDate.getDate() + 1);
				to = toDate.toJSON().split('T')[0];
			}
			if (from) {
				const order = await this.order
					.find(
						{
							finishedTime: { $gte: new Date(from), $lte: new Date(to) },
						},
						{ 'orderedProducts._id': 0 }
					)
					.sort({ orderedTime: -1 });
				if (order) {
					res.json(order);
				} else {
					throw Error('02');
				}
			} else {
				throw Error('53');
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

	private getAllByPage = async (req: Request, res: Response) => {
		try {
			const number = Number(req.params.number);
			if (number > 0) {
				if (number) {
					const order = await this.order.aggregate([
						{ $sort: { orderedTime: -1 } },
						{ $skip: number * 10 },
						{ $limit: (number + 1) * 10 },
						{ $project: { 'orderedProducts._id': 0 } },
					]);
					if (order) {
						res.json({
							pageCount: Math.ceil((await this.order.find()).length / 10) - 1,
							orders: order,
						});
					} else {
						throw Error('02');
					}
				} else {
					throw Error('55');
				}
			} else {
				throw Error('65');
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
					name: Joi.string().required().messages({
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
