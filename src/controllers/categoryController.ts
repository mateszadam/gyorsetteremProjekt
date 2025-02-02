import { Router, Request, Response } from 'express';
import { ICategory, IController } from '../models/models';
import { categoryModel } from '../models/mongooseSchema';
import { authenticateAdminToken } from '../services/tokenService';
import { defaultAnswers } from '../helpers/statusCodeHelper';

export default class categoryController implements IController {
	public router = Router();
	private category = categoryModel;
	public endPoint = '/category';

	/**
	 * @swagger
	 * /category/add:
	 *   post:
	 *     summary: Add a new category
	 *     tags: [Category]
	 *     security:
	 *       - bearerAuth: []
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             required:
	 *               - name
	 *               - icon
	 *             properties:
	 *               name:
	 *                 type: string
	 *                 description: Name of the item
	 *               icon:
	 *                 type: string
	 *                 description: Icon of the category
	 *     responses:
	 *       200:
	 *         description: Category added successfully
	 *       400:
	 *         description: Bad request
	 * /category/all:
	 *   get:
	 *     summary: Get all categories
	 *     tags: [Category]
	 *     security:
	 *       - bearerAuth: []
	 *     responses:
	 *       200:
	 *         description: A list of categories
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: array
	 *               items:
	 *                 $ref: '#/components/schemas/Category'
	 *       400:
	 *         description: Bad request
	 */

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
			const response = await this.category.find({}, { _id: 0 });
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
