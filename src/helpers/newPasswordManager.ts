import fs from 'fs';
import { Request } from 'express';
import { log } from 'console';
import { userModel } from '../models/mongooseSchema';

export default class forgetPassword {
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
			const token = Math.random().toString(36);

			this.tokens.push({ token: token, user: user });

			var mailOptions = {
				from: 'adads@fafa.com',
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
}
