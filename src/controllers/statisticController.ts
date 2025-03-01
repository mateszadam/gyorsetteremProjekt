import { Router, Request, Response } from 'express';
import { IFood, IController, ICategory, IOrder } from '../models/models';
import {
	categoryModel,
	foodModel,
	materialModel,
	orderModel,
	userModel,
} from '../models/mongooseSchema';
import { authAdminToken, authToken } from '../services/tokenService';
import defaultAnswers from '../helpers/statusCodeHelper';

import languageBasedErrorMessage from '../helpers/languageHelper';
import { log } from 'console';

export default class statisticController implements IController {
	public router = Router();
	public endPoint = '/dashboard';
	private user = userModel;
	private order = orderModel;
	constructor() {
		this.router.post(
			'/registeredUsers',
			authAdminToken,
			this.getRegisteredUsers
		);
		this.router.post('/revenue', authAdminToken, this.getRevenue);
		this.router.post('/soldProducts', authAdminToken, this.getSoldProducts);
		this.router.post('/orderCount', authAdminToken, this.getOrderCount);
		this.router.post(
			'/categorizedOrders',
			authAdminToken,
			this.getCategorizedOrders
		);
		this.router.post('/orderTimes', authAdminToken, this.getOrderTimes);
		this.router.post('/totalOrders', authAdminToken, this.getTotalOrders);
	}

	private getRegisteredUsers = async (req: Request, res: Response) => {
		const { startDate, endDate } = req.query;
		try {
			if (!startDate || !endDate) {
				throw new Error('92');
			}

			const users = await this.user.countDocuments({
				role: 'customer',
				registeredAt: {
					$gte: new Date(startDate as string),
					$lte: new Date(endDate as string),
				},
			});
			const totalUsers = await this.user.countDocuments({
				role: 'customer',
			});
			defaultAnswers.ok(res, { filteredUsers: users, totalUsers: totalUsers });
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};

	private getRevenue = async (req: Request, res: Response) => {
		const { startDate, endDate } = req.query;
		try {
			if (!startDate || !endDate) {
				throw new Error('92');
			}
			const revenue = await this.order.aggregate([
				{
					$match: {
						orderedTime: {
							$gte: new Date(startDate as string),
							$lte: new Date(endDate as string),
						},
					},
				},
				{ $group: { _id: null, total: { $sum: '$totalPrice' } } },
			]);
			defaultAnswers.ok(res, { revenue: revenue[0] ? revenue[0].total : 0 });
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};

	private getSoldProducts = async (req: Request, res: Response) => {
		const { startDate, endDate } = req.query;
		try {
			if (!startDate || !endDate) {
				throw new Error('92');
			}
			const soldProducts = await this.order.aggregate([
				{
					$match: {
						orderedTime: {
							$gte: new Date(startDate as string),
							$lte: new Date(endDate as string),
						},
					},
				},
				{
					$unwind: '$orderedProducts',
				},
				{
					$group: {
						_id: null,
						total: { $sum: '$orderedProducts.quantity' },
					},
				},
			]);
			defaultAnswers.ok(res, {
				soldProducts: soldProducts[0] ? soldProducts[0].total : 0,
			});
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};

	private getOrderCount = async (req: Request, res: Response) => {
		const { startDate, endDate } = req.query;
		try {
			if (!startDate || !endDate) {
				throw new Error('92');
			}
			const orderCount = await this.order.countDocuments({
				orderedTime: {
					$gte: new Date(startDate as string),
					$lte: new Date(endDate as string),
				},
			});
			defaultAnswers.ok(res, { orderCount: orderCount });
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};

	private getCategorizedOrders = async (req: Request, res: Response) => {
		const { startDate, endDate } = req.query;
		const category = req.body.category;
		try {
			if (!startDate || !endDate) {
				throw new Error('92');
			}
			let boundaries = [];
			let max = (
				await this.order.aggregate([
					{
						$group: {
							_id: null,
							max: { $max: '$totalPrice' },
						},
					},
				])
			)[0].max;
			if (!category) {
				let current = 1;
				do {
					boundaries.push(current * 1000);
					current++;
				} while (max > current * 1000);
				boundaries.push(max);
				boundaries.push(max + 1);
			} else {
				boundaries = category;
				boundaries.push(max + 1);

				boundaries.sort((a: number, b: number) => a - b);
			}

			const orders = await this.order.aggregate([
				{
					$match: {
						orderedTime: {
							$gte: new Date(startDate as string),
							$lte: new Date(endDate as string),
						},
					},
				},
				{
					$bucket: {
						groupBy: '$totalPrice',
						boundaries: boundaries,
						default: 0,
					},
				},
			]);
			defaultAnswers.ok(res, orders);
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};

	private getOrderTimes = async (req: Request, res: Response) => {
		const { startDate, endDate } = req.query;
		try {
			if (!startDate || !endDate) {
				throw new Error('92');
			}
			const orders: IOrder[] | null = await this.order.find({
				orderedTime: {
					$gte: new Date(startDate as string),
					$lte: new Date(endDate as string),
				},
			});
			if (!orders) {
				throw new Error('00');
			}
			const times = orders.map((order: IOrder) => ({
				cookingTime: Math.floor(
					Math.abs(
						(Number(order.finishedCokingTime) ?? 0) -
							(Number(order.orderedTime) ?? 0)
					) /
						(60 * 60 * 24)
				),
				handoverTime: Math.floor(
					Math.abs(
						(Number(order.finishedTime) ?? 0) - (Number(order.orderedTime) ?? 0)
					) /
						(60 * 60 * 24)
				),
			}));

			const avgCookingTime =
				times.reduce((acc, time) => acc + time.cookingTime, 0) / times.length;
			const avgHandoverTime =
				times.reduce((acc, time) => acc + time.handoverTime, 0) / times.length;
			defaultAnswers.ok(res, {
				avgCookingTime: avgCookingTime,
				avgHandoverTime: avgHandoverTime,
			});
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};

	private getTotalOrders = async (req: Request, res: Response) => {
		try {
			const totalOrders = await this.order.countDocuments();
			res.status(200).send({ totalOrders });
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};
}
