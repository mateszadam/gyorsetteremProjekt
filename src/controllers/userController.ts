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
import languageBasedErrorMessage from '../helpers/languageHelper';
import { ObjectId } from 'mongoose';

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
		this.router.get('/all', authAdminToken, this.getAll);

		this.router.delete('/delete/admin/:id', authAdminToken, this.deleteAdmin);
		this.router.delete('/delete/customer/:id', authToken, this.deleteCostumer);

		this.router.post('/logout', authToken, this.logoutUser);
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
						throw Error('06');
					}
				} else {
					throw Error('08');
				}
			} else {
				throw Error('07');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};

	private getAll = async (req: Request, res: Response) => {
		try {
			const data = await this.user.find({}, { password: 0, token: 0 });
			res.send(data);
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};

	private registerUser = async (req: Request, res: Response) => {
		try {
			let userInput: IUser = req.body;
			await this.userConstraints.validateAsync(userInput);

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
				throw Error('02');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(
					req,
					languageBasedErrorMessage.getError(req, error.message)
				)
			);
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
				throw Error('13');
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
				throw Error('14');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};
	private logoutUser = async (req: Request, res: Response) => {
		try {
			// TODO: Implement logout
			defaultAnswers.notImplemented(res);
			// const token = req.headers.authorization?.replace('Bearer ', '');
			// if (token) {
			// 	const updateResult = await this.user.updateOne(
			// 		{
			// 			token: token,
			// 		},
			// 		{ $set: { token: null } }
			// 	);
			// 	if (updateResult.modifiedCount > 0) {
			// 		defaultAnswers.ok(res);
			// 	} else {
			// 		throw Error('Token not found in database');
			// 	}
			// } else {
			// 	throw Error('Token not found in the header');
			// }
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};
	private registerAdmin = async (req: Request, res: Response) => {
		try {
			let userInput: IUser = req.body;
			await this.userConstraints.validateAsync(userInput);

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
				throw Error('02');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};

	private deleteCostumer = async (req: Request, res: Response) => {
		try {
			let userId: string = req.params.id;
			if (userId) {
				const user = await this.user.findByIdAndDelete(userId);
				if (user) {
					defaultAnswers.created(res);
				} else {
					throw Error('06');
				}
			} else {
				throw Error('07');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};

	private deleteAdmin = async (req: Request, res: Response) => {
		try {
			let userId: string = req.params.id;
			if (userId) {
				const user = await this.user.findByIdAndDelete(userId);
				if (user) {
					defaultAnswers.created(res);
				} else {
					throw Error('06');
				}
			} else {
				throw Error('07');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedErrorMessage.getError(req, error.message)
			);
		}
	};

	private userConstraints = Joi.object({
		name: Joi.string().min(4).required().messages({
			'string.base': '17',
			'string.empty': '17',
			'string.min': '18',
			'any.required': '17',
		}),
		password: Joi.string()
			.pattern(
				/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
			)
			.required()
			.messages({
				'string.empty': '15',
				'string.pattern.base': '16',
				'any.required': '15',
			}),
		email: Joi.string().email().required().messages({
			'string.empty': '30',
			'string.email': '31',
			'any.required': '30',
		}),
	});
}
