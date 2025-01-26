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
