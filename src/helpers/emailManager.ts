import fs from 'fs';
import { Request } from 'express';
import { log } from 'console';
import { userModel } from '../models/mongooseSchema';
import { IUser } from '../models/models';
import webSocetController from '../controllers/websocketController';
import { generateUUID4Token } from '../services/tokenService';

export default class emailManager {
	private static nodemailer = require('nodemailer');
	private static bcrypt = require('bcrypt');

	private static readonly transporter = this.nodemailer.createTransport({
		service: 'gmail',
		auth: {
			user: 'matesz.adam2@gmail.com',
			pass: process.env.EMAIL || '',
		},
	});
	private static readonly tokens: any[] = [];
	private static readonly adminsWaitingToAuth: any[] = [];
	static async sendPasswordChange(req: Request) {
		try {
			const email = req.body.email;
			if (!email) {
				return 'Email is required';
			}
			log('Finding user');
			const user = await userModel.findOne({ email: email });
			log(user);
			if (!user) {
				return 'User not found';
			}
			const token = generateUUID4Token();

			this.tokens.push({ token: token, user: user });

			var mailOptions = {
				from: 'Étterem',
				to: user.email,
				subject: 'Sending Email using Node.js',
				html:
					'<h1>Jelszó módosítás!</h1><p>Kattints a linkre a jelszó módosításához:' +
					'<a href="http://localhost:5005/changePassword/' +
					token +
					'">http://localhost:5005/changePassword/' +
					token +
					'</a></p>',
			};
			log('Sending email');
			await this.transporter.sendMail(
				mailOptions,
				function (error: any, info: any) {
					if (error) {
						console.log(error);
					} else {
						console.log('Email sent: ' + info.response);
					}
				}
			);
		} catch (err) {
			console.log(err);
			return 'Internal Server Error';
		}
	}
	static async changePassword(req: Request) {
		try {
			const token = req.body.token;
			const password = req.body.password;
			log(this.tokens);
			log(token);
			if (!token || !password || !this.tokens.find((t) => t.token === token)) {
				return 'Invalid token';
			}
			console.log('Changing password');

			const hashedPassword = await this.bcrypt.hash(password, 12);

			log('Finding user');

			const user = this.tokens.find((t) => t.token === token).user;
			log(password);
			log(user);
			const a = await userModel.updateOne(
				{ _id: user._id },
				{ password: hashedPassword }
			);

			this.tokens.splice(
				this.tokens.findIndex((t) => t.token === token),
				1
			);
			log(a);

			return 'Password changed';
		} catch (err) {
			console.log(err);
			return 'Internal Server Error';
		}
	}

	static async twoFactorAuth(admin: IUser) {
		try {
			const token = generateUUID4Token();
			const WebSocketToken = generateUUID4Token();

			log(token);
			log(WebSocketToken);

			this.adminsWaitingToAuth.push({
				token: token,
				user: admin,
				WebSocketToken: WebSocketToken,
			});

			var mailOptions = {
				from: 'Étterem',
				to: admin.email,
				subject: 'Sending Email using Node.js',
				html:
					'<h1>Two factor auth!</h1><p>Kattints a linkre a belépéshez:' +
					'<a href="http://localhost:5005/user/auth/' +
					token +
					'">http://localhost:5005/user/auth/' +
					'</a></p>',
			};
			log('Sending email');
			await this.transporter.sendMail(
				mailOptions,
				function (error: any, info: any) {
					if (error) {
						console.log(error);
					} else {
						console.log('Email sent: ' + info.response);
					}
				}
			);
			log(this.adminsWaitingToAuth);
			return WebSocketToken;
		} catch (err) {
			console.log(err);
			return 'Internal Server Error';
		}
	}
	static async authAdmin(token: string) {
		try {
			log(token);
			log(this.adminsWaitingToAuth);
			if (!token || !this.adminsWaitingToAuth.find((t) => t.token === token)) {
				return 'Invalid token';
			}

			webSocetController.sendStateChangeToAdmins(
				this.adminsWaitingToAuth.find((t) => t.token === token)
			);
			this.adminsWaitingToAuth.slice(
				this.adminsWaitingToAuth.findIndex((t) => t.token === token),
				1
			);
			return 'Admin authenticated';
		} catch (err) {
			console.log(err);
			return 'Internal Server Error';
		}
	}
}
