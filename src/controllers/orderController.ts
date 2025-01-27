import { Router, Request, Response } from 'express';
import {
	defaultAnswers,
	getObjectID,
	getRawId,
	IController,
	Order,
	User,
} from '../models/models';
import { orderModel, userModel } from '../models/mongooseSchema';
import {
	authenticateAdminToken,
	authenticateToken,
	generateToken,
	isAuthValid,
} from '../services/tokenService';
import { log } from 'console';

export default class orderController implements IController {
	public router = Router();
	public endPoint = '/order';
	private order = orderModel;
	private user = userModel;
	private mongoose = require('mongoose');
	/**
	 * @swagger
	 * tags:
	 *   name: Orders
	 *   description: Order management
	 */

	/**
	 * @swagger
	 * /order/new:
	 *   post:
	 *     summary: Create a new order
	 *     tags: [Orders]
	 *     security:
	 *       - bearerAuth: []
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *                   type: object
	 *                   properties:
	 *                     costumerID:
	 *                       type: string
	 *                       default: 6793bb6219bff92baf980ade
	 *                     orderedProducts:
	 *                       type: object
	 *                       properties:
	 *                         name:
	 *                           type: string
	 *                           default: Pizza
	 *                         quantity:
	 *                           type: number
	 *                           default: 2
	 *                   required:
	 *                     - name
	 *                     - price
	 *     responses:
	 *       201:
	 *         description: Order created successfully
	 *       400:
	 *         description: Bad request
	 */

	/**
	 * @swagger
	 * /order/ongoing:
	 *   get:
	 *     summary: Get all ongoing orders
	 *     tags: [Orders]
	 *     security:
	 *       - bearerAuth: []
	 *     responses:
	 *       200:
	 *         description: List of ongoing orders
	 *       400:
	 *         description: Bad request
	 */

	/**
	 * @swagger
	 * /order/ongoing/{id}:
	 *   get:
	 *     summary: Get ongoing orders by user id
	 *     tags: [Orders]
	 *     security:
	 *       - bearerAuth: []
	 *     parameters:
	 *       - in: path
	 *         name: id
	 *         schema:
	 *           type: string
	 *         required: true
	 *         description: User ID
	 *     responses:
	 *       200:
	 *         description: Order marked as finished
	 *       400:
	 *         description: Bad request
	 */

	/**
	 * @swagger
	 * /order/finish/{id}:
	 *   get:
	 *     summary: Mark an order as finished
	 *     tags: [Orders]
	 *     security:
	 *       - bearerAuth: []
	 *     parameters:
	 *       - in: path
	 *         name: id
	 *         schema:
	 *           type: string
	 *         required: true
	 *         description: Order ID
	 *     responses:
	 *       200:
	 *         description: Order marked as finished
	 *       400:
	 *         description: Bad request
	 */

	/**
	 * @swagger
	 * /order/{id}:
	 *   get:
	 *     summary: Get an order by Id
	 *     tags: [Orders]
	 *     security:
	 *       - bearerAuth: []
	 *     parameters:
	 *       - in: path
	 *         name: id
	 *         schema:
	 *           type: string
	 *         required: true
	 *         description: Order ID
	 *     responses:
	 *       200:
	 *         description: Order by id
	 *       400:
	 *         description: Bad request
	 */

	constructor() {
		this.router.post('/new', authenticateToken, this.newOrder);
		this.router.get(
			'/ongoing',
			authenticateAdminToken,
			this.getAllOngoingOrder
		);
		this.router.get('/ongoing/:id', authenticateToken, this.getOngoingById);

		this.router.get('/finish/:id', authenticateAdminToken, this.finishOrder);

		this.router.get(
			'kitchen/finish/:id',
			authenticateAdminToken,
			this.finishOrder
		);

		/**
		 * @swagger
		 * /order/time/{from}/{to}:
		 *   get:
		 *     summary: Get all orders within a time range
		 *     tags: [Orders]
		 *     security:
		 *       - bearerAuth: []
		 *     parameters:
		 *       - in: path
		 *         name: from
		 *         schema:
		 *           type: string
		 *           format: date
		 *         required: true
		 *         description: Start date of the time range
		 *       - in: path
		 *         name: to
		 *         schema:
		 *           type: string
		 *           format: date
		 *         description: End date of the time range
		 *     responses:
		 *       200:
		 *         description: List of orders within the time range
		 *       400:
		 *         description: Bad request
		 */
		this.router.get('/time/:from/:to', authenticateToken, this.getAllOrder);
		this.router.get('/:id', authenticateToken, this.getById);
	}

	private newOrder = async (req: Request, res: Response) => {
		try {
			const newOrder: Order = req.body;
			const userExists = await this.user.find({
				_id: new this.mongoose.Types.ObjectId(newOrder.costumerID!),
			});
			if (userExists.length > 0) {
				if (newOrder) {
					const order = await this.order.insertMany([newOrder]);
					if (order) {
						defaultAnswers.created(res);
					} else {
						defaultAnswers.badRequest(res);
					}
				} else {
					defaultAnswers.badRequest(res);
				}
			} else {
				defaultAnswers.badRequest(res, 'User with this id not found');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};

	private getById = async (req: Request, res: Response) => {
		try {
			const id = req.params.id;
			if (id) {
				const order = await this.order.find({
					_id: new this.mongoose.Types.ObjectId(id),
				});
				if (order) {
					res.json(order);
				} else {
					defaultAnswers.badRequest(res);
				}
			} else {
				defaultAnswers.created(res);
			}
			defaultAnswers.notImplemented(res);
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
	private getAllOngoingOrder = async (req: Request, res: Response) => {
		try {
			const order: Order[] = await this.order.find({ isFinished: false });
			if (order) {
				res.json(order);
			} else {
				defaultAnswers.badRequest(res);
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
					costumerID: id,
					isFinished: false,
				});
				if (order) {
					res.json(order);
				} else {
					defaultAnswers.badRequest(res);
				}
			} else {
				defaultAnswers.created(res);
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
	private finishOrder = async (req: Request, res: Response) => {
		try {
			const id = req.params.id;
			log(id);
			if (id) {
				const order = await this.order.updateOne(
					{
						_id: new this.mongoose.Types.ObjectId(id),
					},
					{
						$set: { isFinished: true, finishedTime: Date.now() },
					}
				);
				if (order) {
					res.json(order);
				} else {
					defaultAnswers.badRequest(res);
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
				to = new Date().toJSON();
			}

			if (from) {
				const order = await this.order.find({
					finishedTime: { $gte: new Date(from), $lte: new Date(to) },
				});
				if (order) {
					res.json(order);
				} else {
					defaultAnswers.badRequest(res);
				}
			} else {
				defaultAnswers.badRequest(res);
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
}
