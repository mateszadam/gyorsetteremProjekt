import { Router, Request, Response } from 'express';
import { IFood, IController, ICategory, IOrder } from '../models/models';
import { foodModel, orderModel, userModel } from '../models/mongooseSchema';
import { authAdminToken, authToken } from '../services/tokenService';
import defaultAnswers from '../helpers/statusCodeHelper';

import languageBasedMessage from '../helpers/languageHelper';

import { log } from 'console';

export default class statisticController implements IController {
	public router = Router();
	public endPoint = '/dashboard';
	private user = userModel;
	private order = orderModel;
	private food = foodModel;
	constructor() {
		this.router.get(
			'/registeredUsers',
			authAdminToken,
			this.getRegisteredUsers
		);
		this.router.get('/revenue', authAdminToken, this.getRevenue);
		this.router.get('/soldProducts', authAdminToken, this.getSoldProducts);
		this.router.get('/orderCount', authAdminToken, this.getOrderCount);
		this.router.get(
			'/categorizedOrders',
			authAdminToken,
			this.getCategorizedOrders
		);
		this.router.get('/orderTimes', authAdminToken, this.getOrderTimes);
		this.router.get('/totalOrders', authAdminToken, this.getTotalOrders);
		this.router.get(
			'/ordersThisWeek',
			authAdminToken,
			this.getOrdersAndSoldProductsOnThisWeek
		);
		this.router.get('/timeOfOrders', authAdminToken, this.getTimeOfOrders);
		this.router.get(
			'/cookingTime',
			authAdminToken,
			this.getCookingTimeEachDayOfTheWeek
		);
		this.router.get('/overview', authAdminToken, this.getOverview);
	}

	private getRegisteredUsers = async (req: Request, res: Response) => {
		let { startDate, endDate } = req.query;
		try {
			if (!startDate || !endDate) {
				throw new Error('92');
			}
			let startDateObj = new Date(startDate as string);
			let endDateObj = new Date(endDate as string);

			if (startDateObj > endDateObj) {
				endDateObj = new Date(startDate as string);
				startDateObj = new Date(endDate as string);
			}

			const users = await this.user.countDocuments({
				role: 'customer',
				registeredAt: {
					$gte: startDateObj,
					$lte: endDateObj,
				},
			});
			const totalUsers = await this.user.countDocuments({
				role: 'customer',
			});
			defaultAnswers.ok(res, { filteredUsers: users, totalUsers: totalUsers });
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
			);
		}
	};

	private getRevenue = async (req: Request, res: Response) => {
		const { startDate, endDate } = req.query;
		try {
			if (!startDate || !endDate) {
				throw new Error('92');
			}

			let startDateObj = new Date(startDate as string);
			let endDateObj = new Date(endDate as string);

			if (startDateObj > endDateObj) {
				endDateObj = new Date(startDate as string);
				startDateObj = new Date(endDate as string);
			}

			const revenue = await this.order.aggregate([
				{
					$match: {
						orderedTime: {
							$gte: startDateObj,
							$lte: endDateObj,
						},
					},
				},
				{ $group: { _id: null, total: { $sum: '$totalPrice' } } },
			]);
			defaultAnswers.ok(res, { revenue: revenue[0] ? revenue[0].total : 0 });
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
			);
		}
	};

	private getSoldProducts = async (req: Request, res: Response) => {
		const { startDate, endDate } = req.query;
		try {
			if (!startDate || !endDate) {
				throw new Error('92');
			}

			let startDateObj = new Date(startDate as string);
			let endDateObj = new Date(endDate as string);

			if (startDateObj > endDateObj) {
				endDateObj = new Date(startDate as string);
				startDateObj = new Date(endDate as string);
			}

			const soldProducts = await this.order.aggregate([
				{
					$match: {
						orderedTime: {
							$gte: startDateObj,
							$lte: endDateObj,
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
				languageBasedMessage.getError(req, error.message)
			);
		}
	};

	private getOrderCount = async (req: Request, res: Response) => {
		const { startDate, endDate } = req.query;
		try {
			if (!startDate || !endDate) {
				throw new Error('92');
			}
			let startDateObj = new Date(startDate as string);
			let endDateObj = new Date(endDate as string);

			if (startDateObj > endDateObj) {
				endDateObj = new Date(startDate as string);
				startDateObj = new Date(endDate as string);
			}
			const orderCount = await this.order.countDocuments({
				orderedTime: {
					$gte: startDateObj,
					$lte: endDateObj,
				},
			});
			defaultAnswers.ok(res, { orderCount: orderCount });
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
			);
		}
	};

	private getCategorizedOrders = async (req: Request, res: Response) => {
		let { startDate, endDate, categories } = req.query;

		try {
			if (!startDate || !endDate) {
				throw new Error('92');
			}
			let startDateObj = new Date(startDate as string);
			let endDateObj = new Date(endDate as string);

			if (startDateObj > endDateObj) {
				endDateObj = new Date(startDate as string);
				startDateObj = new Date(endDate as string);
			}
			let boundaries: number[] = [];

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
			if (!categories) {
				let current = 1;
				do {
					boundaries.push(current * 1000);
					current++;
				} while (max > current * 1000);
				boundaries.push(max);
				boundaries.push(max + 1);
			} else {
				if (!isNaN(Number(categories))) {
					boundaries.push(Number(categories));
				} else {
					boundaries = (categories as string[]).map(Number);
				}
				boundaries.push(max + 1);
			}
			boundaries.sort((a: number, b: number) => a - b);

			const orders = await this.order.aggregate([
				{
					$match: {
						orderedTime: {
							$gte: startDateObj,
							$lte: endDateObj,
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

			if (orders.length === 0) {
				for (let i = 0; i < boundaries.length; i++) {
					orders.push({
						_id: boundaries[i],
						count: 0,
					});
				}
			}
			defaultAnswers.ok(res, orders);
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
			);
		}
	};

	private getOrderTimes = async (req: Request, res: Response) => {
		const { startDate, endDate } = req.query;
		try {
			if (!startDate || !endDate) {
				throw new Error('92');
			}

			let startDateObj = new Date(startDate as string);
			let endDateObj = new Date(endDate as string);

			if (startDateObj > endDateObj) {
				endDateObj = new Date(startDate as string);
				startDateObj = new Date(endDate as string);
			}

			const orders: IOrder[] | null = await this.order.find({
				orderedTime: {
					$gte: startDateObj,
					$lte: endDateObj,
				},
				finishedCokingTime: { $ne: null },
				finishedTime: { $ne: null },
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
				languageBasedMessage.getError(req, error.message)
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
				languageBasedMessage.getError(req, error.message)
			);
		}
	};

	private getOrdersAndSoldProductsOnThisWeek = async (
		req: Request,
		res: Response
	) => {
		try {
			const inputDate = new Date(req.query.date as string);
			if (!inputDate) {
				throw new Error('92');
			}

			const daysOfWeek = this.getCurrentWeekFromDate(inputDate);
			const orders = await this.order.aggregate([
				{
					$match: {
						orderedTime: {
							$gte: daysOfWeek[0],
							$lte: daysOfWeek[6],
						},
					},
				},
				{
					$group: {
						_id: {
							$dateToString: { format: '%Y-%m-%d', date: '$orderedTime' },
						},

						orderCount: { $sum: 1 },
						productCount: { $sum: { $sum: '$orderedProducts.quantity' } },
					},
				},
			]);
			for (let i = 0; i < daysOfWeek.length; i++) {
				const day = daysOfWeek[i];
				const dayString = day.toISOString().split('T')[0];
				const order = orders.find((o) => o._id === dayString);
				if (!order) {
					orders.push({
						_id: dayString,
						orderCount: 0,
						productCount: 0,
					});
				}
			}
			orders.sort((a, b) => (a._id > b._id ? 1 : -1));

			res.status(200).send({ orders: orders });
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
			);
		}
	};

	private getTimeOfOrders = async (req: Request, res: Response) => {
		try {
			const inputDate = new Date(req.query.date as string);
			if (!inputDate) {
				throw new Error('92');
			}

			const daysOfWeek = this.getCurrentWeekFromDate(inputDate);

			const orders = await this.order.aggregate([
				{
					$match: {
						orderedTime: {
							$gte: daysOfWeek[0],
							$lte: daysOfWeek[6],
						},
					},
				},
				{
					$group: {
						_id: {
							$dateToString: { format: '%H', date: '$orderedTime' },
						},
						count: { $sum: 1 },
					},
				},
				{
					$sort: { _id: 1 },
				},
			]);

			res.status(200).send({ orders: orders });
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
			);
		}
	};

	private getCookingTimeEachDayOfTheWeek = async (
		req: Request,
		res: Response
	) => {
		try {
			const inputDate = new Date(req.query.date as string);
			if (!inputDate) {
				throw new Error('92');
			}

			const daysOfWeek = this.getCurrentWeekFromDate(inputDate);

			const orders = await this.order.aggregate([
				{
					$match: {
						orderedTime: {
							$gte: daysOfWeek[0],
							$lte: daysOfWeek[6],
						},
					},
				},
				{
					$group: {
						_id: {
							$dateToString: { format: '%Y-%m-%d', date: '$orderedTime' },
						},
						avgCookingTime: {
							$avg: {
								$divide: [
									{
										$subtract: ['$finishedCokingTime', '$orderedTime'],
									},
									1000 * 60 * 60,
								],
							},
						},
						avgHandoverTime: {
							$avg: {
								$divide: [
									{
										$subtract: ['$finishedTime', '$finishedCokingTime'],
									},
									1000 * 60 * 60,
								],
							},
						},
					},
				},
				{
					$sort: { _id: 1 },
				},
			]);

			orders.forEach((order) => {
				order.avgCookingTime = order.avgCookingTime || 0;
				order.avgHandoverTime = order.avgHandoverTime || 0;
			});

			for (let i = 0; i < daysOfWeek.length; i++) {
				const day = daysOfWeek[i];
				const dayString = day.toISOString().split('T')[0];
				const order = orders.find((o) => o._id === dayString);
				if (!order) {
					orders.push({
						_id: dayString,
						avgCookingTime: 0,
					});
				}
			}

			orders.sort((a, b) => (a._id > b._id ? 1 : -1));
			res.status(200).send({ orders: orders });
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
			);
		}
	};
	private getOverview = async (req: Request, res: Response) => {
		try {
			const today = new Date();
			const startOfToday = new Date(today.setHours(0, 0, 0, 0));
			const endOfToday = new Date(today.setHours(23, 59, 59, 999));

			// Get first and last day of current month
			const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
			const endOfMonth = new Date(
				today.getFullYear(),
				today.getMonth() + 1,
				0,
				23,
				59,
				59,
				999
			);

			const todayOrderCount = await this.order.countDocuments({
				orderedTime: { $gte: startOfToday, $lte: endOfToday },
			});

			const todayRevenue = await this.order.aggregate([
				{
					$match: {
						orderedTime: { $gte: startOfToday, $lte: endOfToday },
					},
				},
				{ $group: { _id: null, total: { $sum: '$totalPrice' } } },
			]);

			const monthlyOrderCount = await this.order.countDocuments({
				orderedTime: { $gte: startOfMonth, $lte: endOfMonth },
			});

			const activeCategoriesCount =
				(
					await this.food.aggregate([
						{
							$match: {
								isEnabled: true,

								isDeleted: false,
							},
						},
						{
							$unwind: '$subCategoryId',
						},
						{
							$group: {
								_id: '$subCategoryId',
							},
						},
						{
							$count: 'activeCategoriesCount',
						},
					])
				)[0]?.activeCategoriesCount || 0;
			const availableFoodsCount = await this.food.countDocuments({
				isEnabled: true,
				isDeleted: false,
			});

			defaultAnswers.ok(res, {
				todayOrderCount,
				todayRevenue: todayRevenue[0]?.total || 0,
				monthlyOrderCount,
				activeCategoriesCount,
				availableFoodsCount,
			});
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
			);
		}
	};

	private getCurrentWeekFromDate(inputDate: Date): Date[] {
		const firstDayOfThisWeek = new Date(
			inputDate.setDate(
				inputDate.getDate() -
					inputDate.getDay() +
					(inputDate.getDay() === 0 ? -6 : 1)
			)
		);
		const daysOfWeek = [];

		for (let i = 0; i < 7; i++) {
			const date = new Date(firstDayOfThisWeek);
			date.setHours(firstDayOfThisWeek.getHours() + i * 24);
			daysOfWeek.push(date);
		}

		return daysOfWeek;
	}
}
