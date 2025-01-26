import { Router, Request, Response } from 'express';
import {
	defaultAnswers,
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
	 *             $ref: '#/components/schemas/Order'
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
	 * /order/ongoing/{name}:
	 *   get:
	 *     summary: Get ongoing orders by name
	 *     tags: [Orders]
	 *     security:
	 *       - bearerAuth: []
	 *     parameters:
	 *       - in: path
	 *         name: name
	 *         schema:
	 *           type: string
	 *         required: true
	 *         description: Name of the order
	 *     responses:
	 *       200:
	 *         description: List of ongoing orders by name
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
	 * /order/{name}:
	 *   get:
	 *     summary: Get orders by name
	 *     tags: [Orders]
	 *     security:
	 *       - bearerAuth: []
	 *     parameters:
	 *       - in: path
	 *         name: name
	 *         schema:
	 *           type: string
	 *         required: true
	 *         description: Name of the order
	 *     responses:
	 *       200:
	 *         description: List of orders by name
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
		this.router.get('/ongoing/:name', authenticateToken, this.getOngoingByName);

		this.router.get('/finish/:id', authenticateAdminToken, this.finishOrder);

		this.router.get('/:name', authenticateToken, this.getByName);
	}

	private newOrder = async (req: Request, res: Response) => {
		try {
			const newOrder: Order = req.body.order;
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

			defaultAnswers.notImplemented(res);
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
	// TODO: Use id instead of name
	private getByName = async (req: Request, res: Response) => {
		try {
			const name = req.params.name;
			if (name) {
				const order = await this.order.find({
					name: name,
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
	private getOngoingByName = async (req: Request, res: Response) => {
		try {
			const name = req.params.name;
			if (name) {
				const newOrder: Order = req.body.order;
				if (newOrder) {
					const order = await this.order.find({
						name: name,
						isFinished: false,
					});
					if (order) {
						res.json(order);
					} else {
						defaultAnswers.badRequest(res);
					}
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
			if (id) {
				const order = await this.order.updateOne(
					{
						_id: id,
					},
					{
						$set: { isFinished: true },
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
}
