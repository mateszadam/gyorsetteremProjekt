import { Router, Request, Response } from 'express';
import { IController, IUser } from '../models/models';
import { userModel } from '../models/mongooseSchema';
import {
	authAdminToken,
	authToken,
	generateToken,
	getDataFromToken,
} from '../services/tokenService';
import defaultAnswers from '../helpers/statusCodeHelper';
import fs from 'fs';
import Joi from 'joi';

export default class userController implements IController {
	public router = Router();
	private user = userModel;
	public endPoint = '/user';

	bcrypt = require('bcrypt');
	constructor() {
		// TODO: Validáció a user name létezésére
		this.router.post('/register/customer', this.registerUser);
		this.router.post('/register/admin', authAdminToken, this.registerAdmin);

		this.router.post('/login', this.loginUser);
		this.router.get('/all', this.getAll);

		this.router.post('/logout', this.logoutUser);
		this.router.post(
			'/picture/change/:newImageName',
			authToken,
			this.changeProfilePicture
		);
	}
	// https://www.svgrepo.com/collection/people-gestures-and-signs-icons/

	private changeProfilePicture = async (req: Request, res: Response) => {
		try {
			const data = getDataFromToken(
				req.headers.authorization?.replace('Bearer ', '')!
			);
			if (data && data?._id) {
				const newImageName = req.params.newImageName;
				if (
					newImageName &&
					fs.existsSync(`./src/images/profilePictures/${newImageName}`)
				) {
					const updateResult = await this.user.updateOne(
						{
							_id: data._id,
						},
						{ $set: { profilePicture: newImageName } }
					);
					if (updateResult.modifiedCount > 0) {
						defaultAnswers.ok(res);
					} else {
						throw Error('Id not valid in token');
					}
				} else {
					throw Error('New image name not found');
				}
			} else {
				throw Error('Token not found in the header');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};

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
			const validation = await this.userConstraints.validateAsync(userInput);
			if (validation) {
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
				res.status(400).json(validation);
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
				console.log(`User ${databaseUser.name} logged in`);
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
			const validation = await this.userConstraints.validateAsync(userInput);
			if (validation) {
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
				res.status(400).json(validation);
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};

	private userConstraints = Joi.object({
		name: Joi.string().min(4).required().messages({
			'string.base': 'A névnek szövegnek kell lennie',
			'string.empty': 'A név megadása kötelező',
			'string.min': 'A névnek legalább 4 karakter hosszúnak kell lennie',
			'any.required': 'A név megadása kötelező',
		}),
		password: Joi.string()
			.pattern(
				/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
			)
			.required()
			.messages({
				'string.empty': 'A jelszó megadása kötelező',
				'string.pattern.base':
					'A jelszónak tartalmaznia kell legalább egy nagybetűt, egy kisbetűt, egy számot és egy speciális karaktert, és legalább 8 karakter hosszúnak kell lennie',
				'any.required': 'A jelszó megadása kötelező',
			}),
		email: Joi.string().email().required().messages({
			'string.empty': 'Az email megadása kötelező',
			'string.email': 'Nem megfelelő email formátum!',
			'any.required': 'Az email megadása kötelező',
		}),
	});
}
