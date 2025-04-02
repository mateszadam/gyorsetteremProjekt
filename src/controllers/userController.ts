import e, { Router, Request, Response } from 'express';
import { IController, IUser } from '../models/models';
import { userModel } from '../models/mongooseSchema';
import {
	authAdminToken,
	authToken,
	generateToken,
	generateUUID4Token,
	getDataFromToken,
	logOutToken,
} from '../services/tokenService';
import defaultAnswers from '../helpers/statusCodeHelper';
import fs from 'fs';
import Joi from 'joi';
import languageBasedMessage from '../helpers/languageHelper';

import { ObjectId } from 'mongoose';
import { log } from 'console';
import emailManager from '../helpers/emailManager';

export default class userController implements IController {
	public router = Router();
	private user = userModel;
	public endPoint = '/user';

	private CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
	private CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
	private REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
	axios = require('axios');

	bcrypt = require('bcrypt');
	private usersWaitingForAuth = new Map();
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
		this.router.post('/forgetPassword', this.forgetPassword);
		this.router.post('/changePassword', this.changePassword);
		this.router.get('/auth/:token', this.validate2FA);

		this.router.get('/google/callback', this.googleCallback);
		this.router.get('/google', this.googleLogin);
		this.router.get('/google/auth/:token', this.sendGoogleAuthToken);
	}
	// https://www.svgrepo.com/collection/people-gestures-and-signs-icons/

	private changeProfilePicture = async (req: Request, res: Response) => {
		try {
			const data = getDataFromToken(
				req.headers.authorization?.replace('Bearer ', '')!
			);
			if (data && data?._id) {
				const newImageName = req.params.newImageName;
				if (newImageName) {
					if (fs.existsSync(`./src/images/profilePictures/${newImageName}`)) {
						const updateResult = await this.user.updateOne(
							{
								_id: data._id,
							},
							{ $set: { profilePicture: newImageName } }
						);

						if (updateResult.matchedCount > 0) {
							defaultAnswers.ok(res);
						} else {
							throw Error('06');
						}
					} else {
						throw Error('62');
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
				languageBasedMessage.getError(req, error.message)
			);
		}
	};

	private getAll = async (req: Request, res: Response) => {
		try {
			const { page = 1, limit = 10, role } = req.query;
			const query: any = {};
			if (role) {
				query.role = role;
			}
			const data = await this.user
				.find(query, { password: 0 })
				.skip((Number(page) - 1) * Number(limit))
				.limit(Number(limit));
			const total = await this.user.countDocuments(query);
			res.send({
				items: data,

				pageCount: Math.ceil(total / Number(limit)),
			});
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
			);
		}
	};

	private registerUser = async (req: Request, res: Response) => {
		try {
			let userInput: IUser = req.body;
			await this.userConstraints.validateAsync(userInput);

			if (await this.user.findOne({ name: userInput.name })) {
				throw Error('98');
			}

			const hashedPassword = await this.bcrypt.hash(userInput.password, 12);
			const userData: IUser = {
				...userInput,
				password: hashedPassword,
				role: 'customer',
			};
			const user = await this.user.insertMany([userData]);
			if (user) {
				log(`User ${userData.name} registered`);
				defaultAnswers.created(res);
			} else {
				log(`User ${userData.name} not registered`);
				throw Error('02');
			}
		} catch (error: any) {
			log(`Error: ${error.message}`);

			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
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
				// Turn off for testing
				// if (databaseUser.role === 'admin' && process.env.MODE !== 'test') {
				// 	const token = await emailManager.twoFactorAuth(databaseUser);
				// 	defaultAnswers.ok(res, { token: token });
				// } else {
				const token: string = await generateToken(databaseUser);

				console.log(
					`User ${databaseUser.name} logged in (${new Date().toLocaleString()})`
				);
				res.send({
					token: token,
					role: databaseUser.role,
					profilePicture: databaseUser.profilePicture,
					userId: databaseUser._id,
				});
				// }
			} else {
				throw Error('14');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
			);
		}
	};

	private validate2FA = async (req: Request, res: Response) => {
		try {
			const token = req.params.token;
			const result = await emailManager.authAdmin(token);
			let html = '';
			if (result == 'Admin authenticated') {
				html = fs.readFileSync(
					__dirname.replace('controllers', '') + '/static/success.html',
					'utf8'
				);
			} else {
				html = fs.readFileSync(
					__dirname.replace('controllers', '') + '/static/failed.html',
					'utf8'
				);
			}
			res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
			res.write(html);
			res.end();
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
			);
		}
	};

	private logoutUser = async (req: Request, res: Response) => {
		try {
			if (logOutToken(req)) {
				defaultAnswers.ok(res);
			} else {
				defaultAnswers.notAuthorized(res);
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
			);
		}
	};
	private registerAdmin = async (req: Request, res: Response) => {
		try {
			let userInput: IUser = req.body;
			await this.userConstraints.validateAsync(userInput);

			if (!['admin', 'kitchen', 'salesman'].includes(userInput.role)) {
				throw Error('72');
			}

			if (await this.user.findOne({ name: userInput.name })) {
				throw Error('98');
			}

			const hashedPassword = await this.bcrypt.hash(userInput.password, 12);
			const userData: IUser = {
				...userInput,
				password: hashedPassword,
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
				languageBasedMessage.getError(req, error.message)
			);
		}
	};

	private deleteCostumer = async (req: Request, res: Response) => {
		try {
			let userId: string = req.params.id;
			if (userId) {
				const user = await this.user.findById(userId);
				if (user) {
					if (user.role === 'customer') {
						const deletedUser = await this.user.findByIdAndDelete(userId);
						if (deletedUser) {
							defaultAnswers.ok(res);
						} else {
							throw Error('02');
						}
					} else {
						throw Error('63');
					}
				} else {
					throw Error('06');
				}
			} else {
				throw Error('07');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
			);
		}
	};

	private deleteAdmin = async (req: Request, res: Response) => {
		try {
			let userId: string = req.params.id;
			if (userId) {
				const user = await this.user.findByIdAndDelete(userId);
				if (user) {
					defaultAnswers.ok(res);
				} else {
					throw Error('06');
				}
			} else {
				throw Error('07');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
			);
		}
	};

	private forgetPassword = async (req: Request, res: Response) => {
		try {
			const message = await emailManager.sendPasswordChange(req);
			defaultAnswers.ok(res, { message: message });
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
			);
		}
	};

	private changePassword = async (req: Request, res: Response) => {
		try {
			const message = await emailManager.changePassword(req);
			defaultAnswers.ok(res, { message: message });
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
			);
		}
	};

	// Google login
	private googleLogin = async (req: Request, res: Response) => {
		const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${this.CLIENT_ID}&redirect_uri=${this.REDIRECT_URI}&response_type=code&scope=profile email`;
		res.redirect(url);
	};

	private googleCallback = async (req: Request, res: Response) => {
		{
			const { code } = req.query;
			try {
				const { data } = await this.axios.post(
					'https://oauth2.googleapis.com/token',
					{
						client_id: this.CLIENT_ID,
						client_secret: this.CLIENT_SECRET,
						code,
						redirect_uri: this.REDIRECT_URI,
						grant_type: 'authorization_code',
					}
				);
				const { access_token, id_token } = data;

				const { data: profile } = await this.axios.get(
					'https://www.googleapis.com/oauth2/v1/userinfo',
					{
						headers: { Authorization: `Bearer ${access_token}` },
					}
				);

				const user: IUser | null = await userModel.findOne({
					email: profile.email,
				});
				log(profile);
				if (user === null) {
					userModel.insertMany([
						{
							email: profile.email,
							name: profile.name,
							password: this.bcrypt.hashSync(generateUUID4Token(), 12),
							role: 'customer',
							profilePicture: profile.picture,
						},
					]);
				}

				const newUser: IUser | null = await userModel.findOne({
					email: profile.email,
				});

				const token = await generateUUID4Token();
				this.usersWaitingForAuth.set(token, newUser);

				res.redirect('/' + token);
			} catch (error: any) {
				console.error('Error:', error);
				res.redirect('/bejelentkezes');
			}
		}
	};

	private sendGoogleAuthToken = async (req: Request, res: Response) => {
		try {
			const token = req.params.token;
			const user = this.usersWaitingForAuth.get(token);
			if (user) {
				const token = await generateToken(user);
				this.usersWaitingForAuth.delete(token);
				res.send({
					token: token,
					role: user.role,
					profilePicture: user.profilePicture,
					userId: user._id,
				});
			} else {
				throw Error('07');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
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
			.pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*\W)[A-Za-z\d\W]{8,}$/)
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
		role: Joi.string().messages({
			'string.base': '79',
			'string.empty': '79',
			'any.required': '79',
		}),
	});
}
