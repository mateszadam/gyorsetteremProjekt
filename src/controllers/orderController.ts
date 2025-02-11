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
		this.router.get('/:id', authToken, this.getById);

		this.router.patch('/finish/:id', authKitchenToken, this.kitchenFinishOrder);
		this.router.patch('/handover/:id', authKioskToken, this.receivedOrder);
		this.router.get('/page/:number', authKioskToken, this.getAllByPage);
	}

	// https://javascripttricks.com/implementing-transactional-queries-in-mongoose-70c431dd47e9
	private newOrder = async (req: Request, res: Response) => {
		try {
			const newOrder: IOrder = req.body;
			const validation = await this.orderConstraints.validateAsync(newOrder);

			const userExists = await this.user.find({
				_id: newOrder.costumerId,
			});
			if (validation) {
				if (userExists.length > 0) {
					const insertedOrders = await this.order.insertMany([newOrder], {
						rawResult: true,
					});
					if (insertedOrders.acknowledged) {
						const newOrderId = insertedOrders.insertedIds[0];

						if (newOrder && newOrderId) {
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
												orderedFoodMaterials.quantity *
													orderedProducts.quantity,
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
											throw Error('Nincs elegendő alapanyag');
										}
									}
								} else {
									throw Error('Order food is not a valid food');
								}
							}
						} else {
							throw Error('The order in body is not defined');
						}
					} else {
						throw Error('User with this id not found');
					}
					webSocetController.sendStateChange();
					defaultAnswers.created(res);
				} else {
					throw Error('Error in insert into database');
				}
			} else {
				res.status(400).json(validation);
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};

	private getById = async (req: Request, res: Response) => {
		try {
			const id = req.params.id;
			if (id) {
				log('Ez fut');
				const order = await this.order
					.find({
						_id: id,
					})
					.populate('costumerId');
				if (order.length > 0) {
					res.json(order);
				} else {
					throw Error('Order id is not found is database');
				}
			} else {
				defaultAnswers.created(res);
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
	private getAllOngoingOrder = async (req: Request, res: Response) => {
		try {
			const order: IOrder[] = await this.order.find({ finishedTole: null });
			if (order) {
				res.json(order);
			} else {
				throw Error('Error in database');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};

	private getAllForKitchen = async (req: Request, res: Response) => {
		try {
			const order: IOrder[] = await this.order.find({
				finishedCokingTime: null,
			});
			if (order) {
				res.json(order);
			} else {
				throw Error('Error in database');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};

	private getOngoingById = async (req: Request, res: Response) => {
		try {
			const id = req.params.id;
			if (id) {
				const order = await this.order.find({
					costumerId: id,
					isFinished: false,
				});
				if (order) {
					res.json(order);
				} else {
					throw Error('Error in database');
				}
			} else {
				throw Error('Id is not found in the request');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};

	private getFinishedById = async (req: Request, res: Response) => {
		try {
			const id = req.params.id;
			if (id) {
				const order = await this.order.find({
					costumerId: id,
					finishedTime: { $ne: null },
				});
				if (order) {
					res.json(order);
				} else {
					throw Error('Error in database');
				}
			} else {
				throw Error('Id is not found in the request');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
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
					webSocetController.sendStateChange();
					defaultAnswers.ok(res);
				} else {
					throw Error('Id from request is not in database');
				}
			} else {
				defaultAnswers.badRequest(res);
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
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
				const order = await this.order.find({
					finishedTime: { $gte: new Date(from), $lte: new Date(to) },
				});
				if (order) {
					res.json(order);
				} else {
					throw Error('Error in database');
				}
			} else {
				throw Error('From date is not found in the request');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
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
					webSocetController.sendStateChange();

					defaultAnswers.ok(res);
				} else {
					throw Error('The id of the request is not in the database');
				}
			} else {
				throw Error('Id is not found in the request');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};

	private getAllByPage = async (req: Request, res: Response) => {
		try {
			const number = Number(req.params.number);
			if (number) {
				const order = await this.order.aggregate([
					{ $skip: number * 10 },
					{ $limit: (number + 1) * 10 },
				]);
				if (order) {
					res.json(order);
				} else {
					throw Error('Error in database');
				}
			} else {
				throw Error('Id is not found in the request');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};

	private orderConstraints = Joi.object({
		costumerId: Joi.string().required().messages({
			'string.base': 'A costumerId mezőnek szövegnek kell lennie',
			'any.required': 'A costumerId mező kitöltése kötelező',
		}),
		orderedTime: Joi.date().required().messages({
			'date.base': 'Az orderedTime mezőnek dátumnak kell lennie',
			'any.required': 'Az orderedTime mező kitöltése kötelező',
		}),
		finishedTime: Joi.date().optional().allow(null).messages({
			'date.base': 'A finishedTime mezőnek dátumnak kell lennie',
		}),
		finishedCokingTime: Joi.date().optional().allow(null).messages({
			'date.base': 'A finishedCokingTime mezőnek dátumnak kell lennie',
		}),
		orderedProducts: Joi.array()
			.items(
				Joi.object({
					name: Joi.string().required().messages({
						'string.base': 'A name mezőnek szövegnek kell lennie',
						'any.required': 'A name mező kitöltése kötelező',
					}),
					quantity: Joi.number().required().messages({
						'number.base': 'A quantity mezőnek számnak kell lennie',
						'any.required': 'A quantity mező kitöltése kötelező',
					}),
				})
			)
			.required()
			.messages({
				'array.base': 'Az orderedProducts mezőnek tömbnek kell lennie',
				'any.required': 'Az orderedProducts mező kitöltése kötelező',
			}),
	});
}
