import { Router, Request, Response } from 'express';
import { ICategory, IController } from '../models/models';
import { categoryModel } from '../models/mongooseSchema';
import { authenticateAdminToken } from '../services/tokenService';
import { defaultAnswers } from '../helpers/statusCodeHelper';

export default class categoryController implements IController {
	public router = Router();
	private category = categoryModel;
	public endPoint = '/category';

	constructor() {
		this.router.post('/add', authenticateAdminToken, this.add);
		this.router.get('/all', authenticateAdminToken, this.getAll);
	}

	private add = async (req: Request, res: Response) => {
		try {
			const newCategory: ICategory = req.body;
			if (newCategory) {
				const response = await this.category.insertMany([newCategory]);
				if (response) {
					defaultAnswers.ok(res);
				} else {
					throw Error('Failed to insert database');
				}
			} else {
				throw Error('No body found');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
	private getAll = async (req: Request, res: Response) => {
		try {
			const response: ICategory[] = await this.category.find({});
			if (response) {
				res.send(response);
			} else {
				throw Error('Failed to get from database');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
}
