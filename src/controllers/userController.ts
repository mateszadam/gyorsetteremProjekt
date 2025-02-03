import { Router, Request, Response } from 'express';
import { IController, IUser } from '../models/models';
import { userModel } from '../models/mongooseSchema';
import {
	authenticateAdminToken,
	generateToken,
} from '../services/tokenService';
import { defaultAnswers } from '../helpers/statusCodeHelper';

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
		 *       401:
		 *         description: Not authorized
		 *
		 *
		 * /user/register/customer:
		 *   post:
		 *     tags:
		 *       - User handling
		 *     summary: Register a new user
		 *     security: []
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         application/json:
		 *           schema:
		 *             type: object
		 *             required:
		 *               - name
		 *               - password
		 *               - email
		 *             properties:
		 *               name:
		 *                 type: string
		 *                 default: customerUser
		 *               password:
		 *                 type: string
		 *                 default: customerUser!1
		 *               email:
		 *                 type: string
		 *                 default: admin@gmail.hu
		 *     responses:
		 *       201:
		 *         description: User registered successfully
		 *
		 * /user/register/admin:
		 *   post:
		 *     tags:
		 *       - User handling
		 *     summary: Register a new admin
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
		 *               - password
		 *               - email
		 *             properties:
		 *               name:
		 *                 type: string
		 *                 default: adminUser
		 *               password:
		 *                 type: string
		 *                 default: adminUser!1
		 *               email:
		 *                 type: string
		 *                 default: admin@gmail.com
		 *     responses:
		 *       201:
		 *         description: Admin registered successfully
		 *       400:
		 *         description: Bad request
		 *
		 * /user/login:
		 *   post:
		 *     tags:
		 *       - User handling
		 *     summary: Login a user
		 *     security: []
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
		 *
		 * /user/logout:
		 *   post:
		 *     tags:
		 *       - User handling
		 *     summary: Logout a user
		 *     security:
		 *       - bearerAuth: []
		 *     responses:
		 *       200:
		 *         description: User logged out successfully
		 */

		this.router.get('/all', authenticateAdminToken, this.getAll);
		this.router.post('/register/customer', this.registerUser);
		this.router.post(
			'/register/admin',
			authenticateAdminToken,
			this.registerAdmin
		);

		this.router.post('/login', this.loginUser);
		this.router.post('/logout', this.logoutUser);
	}

	private getAll = async (req: Request, res: Response) => {
		try {
			const data = await this.user.find({}, { password: 0, token: 0 });
			res.send(data);
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};

	private registerUser = async (req: Request, res: Response) => {
		try {
			let userInput: IUser = req.body;
			const passwordRegex =
				/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
			const emailRegex =
				/^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;
			if (
				userInput.name &&
				userInput.password &&
				userInput.email &&
				passwordRegex.test(userInput.password) &&
				emailRegex.test(userInput.email) &&
				userInput.name.length > 4
			) {
				const hashedPassword = await this.bcrypt.hash(userInput.password, 12);
				const userData: IUser = {
					...userInput,
					password: hashedPassword,
					role: 'customer',
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
		try {
			let userInput: IUser = req.body;
			const databaseUser: IUser | null = await this.user.findOne({
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
				res.send({
					token: token,
					role: databaseUser.role,
				});
			} else {
				throw Error('Password is not correct');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
	private logoutUser = async (req: Request, res: Response) => {
		try {
			const token = req.headers.authorization?.replace('Bearer ', '');
			if (token) {
				const updateResult = await this.user.updateOne(
					{
						token: token,
					},
					{ $set: { token: null } }
				);
				if (updateResult.modifiedCount > 0) {
					defaultAnswers.ok(res);
				} else {
					throw Error('Token not found in database');
				}
			} else {
				throw Error('Token not found in the header');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
	private registerAdmin = async (req: Request, res: Response) => {
		try {
			let userInput: IUser = req.body;
			const passwordRegex =
				/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
			const emailRegex =
				/^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;

			if (
				userInput.name &&
				userInput.password &&
				userInput.email &&
				passwordRegex.test(userInput.password) &&
				emailRegex.test(userInput.email) &&
				userInput.name.length > 4
			) {
				const hashedPassword = await this.bcrypt.hash(userInput.password, 12);
				const userData: IUser = {
					...userInput,
					password: hashedPassword,
					role: 'admin',
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
}
