import { Router, Request, Response } from 'express';
import { defaultAnswers, getRawId, IController, User } from '../models/models';
import { userModel } from '../models/mongooseSchema';
import {
	authenticateAdminToken,
	generateToken,
	isAuthValid,
} from '../services/tokenService';

export default class userController implements IController {
	public router = Router();
	private user = userModel;
	public endPoint = '/user';

	bcrypt = require('bcrypt');
	constructor() {
		/**
		 * @openapi
		 * /user/all:
		 *   get:
		 *     tags:
		 *       - User handling
		 *     summary: Get all users
		 *     responses:
		 *       201:
		 *         description: User registered successfully
		 *       400:
		 *         description: Bad request
		 *
		 * /user/register:
		 *   post:
		 *     tags:
		 *       - User handling
		 *     summary: Register a new user
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             type: object
		 *             required:
		 *               - name
		 *               - password
		 *             properties:
		 *               name:
		 *                 type: string
		 *                 default: user
		 *               password:
		 *                 type: string
		 *                 default: user
		 *     responses:
		 *       201:
		 *         description: User registered successfully
		 *       400:
		 *         description: Bad request
		 *
		 * /user/login:
		 *   post:
		 *     tags:
		 *       - User handling
		 *     summary: Login a user
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             type: object
		 *             required:
		 *               - name
		 *               - password
		 *             properties:
		 *               name:
		 *                 type: string
		 *                 default: admin
		 *               password:
		 *                 type: string
		 *                 default: admin
		 *     responses:
		 *       200:
		 *         description: User logged in successfully
		 *       401:
		 *         description: Unauthorized
		 */

		this.router.get('/all', authenticateAdminToken, this.getAll);
		this.router.post('/register', this.registerUser);
		this.router.post('/login', this.loginUser);
	}

	private getAll = async (req: Request, res: Response) => {
		try {
			const data = await this.user.find();
			res.send(data);
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};

	private registerUser = async (req: Request, res: Response) => {
		try {
			let userInput: User = req.body;
			if (userInput.name && userInput.password) {
				const hashedPassword = await this.bcrypt.hash(userInput.password, 12);
				const userData: User = {
					...userInput,
					password: hashedPassword,
				};
				const user = await this.user.insertMany([userData]);
				if (user) {
					defaultAnswers.created(res);
				} else {
					throw Error('Unknown error!');
				}
			} else {
				throw Error('Invalid json');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
	private loginUser = async (req: Request, res: Response) => {
		console.log('fut3');

		try {
			let userInput: User = req.body;
			const databaseUser: User | null = await this.user.findOne({
				name: userInput.name,
			});
			if (!userInput || !databaseUser) {
				defaultAnswers.notFound(res);
			} else if (!userInput.name || !userInput.password) {
				throw Error('Invalid JSON');
			} else if (
				await this.bcrypt.compare(userInput.password, databaseUser.password)
			) {
				const token: string = await generateToken(databaseUser);
				await this.user.updateOne(
					{
						_id: databaseUser._id,
					},
					{ $set: { token: token } }
				);
				defaultAnswers.ok(res, token);
			} else {
				throw Error('Password is not correct');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
}
