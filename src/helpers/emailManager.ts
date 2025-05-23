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
	static async sendPasswordChange(req: Request, user: IUser, url: string) {
		try {
			const token = generateUUID4Token();

			this.tokens.push({ token: token, user: user });

			var mailOptions = {
				from: 'Étterem <matesz.adam2@gmail.com>',
				to: user.email,
				subject: 'Jelszó módosítás - Étterem',
				html: `
				<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
					<div style="text-align: center; padding: 20px; background-color: #FF922C; color: white;">
						<h1 style="margin: 0; font-weight: 600; color:#eee;">Étterem</h1>
						<h2 style="margin: 10px 0 0; font-weight: 400;">Jelszó módosítás</h2>
					</div>
					<div style="padding: 30px; background-color: white;">
						<p style="font-size: 16px; color: #333;">Kedves <b>${user.name || 'Felhasználó'}</b>,</p>
						<p style="font-size: 16px; color: #333; line-height: 1.5;">Jelszó módosítást kért fiókjához. Az új jelszó beállításához kattintson az alábbi gombra:</p>
						<div style="text-align: center; margin: 35px 0;">
							<a href="${url}/${token}" style="background-color: #FF922C; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px; transition: all 0.3s ease;">Jelszó módosítása</a>
						</div>
						<p style="font-size: 14px; color: #666; margin-top: 20px;">Ha a link nem működik, másolja be ezt az URL-t a böngészőbe: <span style="color: #FF922C;">${url}/${token}</span></p>
						<p style="font-size: 14px; color: #666; border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">Ha nem Ön kérte a jelszó módosítást, kérjük hagyja figyelmen kívül ezt az e-mailt, vagy lépjen kapcsolatba az adminisztrátorral.</p>
					</div>
					<div style="text-align: center; padding: 15px; background-color: #f8f8f8; font-size: 12px; color: #888;">
						<p>© ${new Date().getFullYear()} Étterem - Minden jog fenntartva</p>
					</div>
				</div>`,
			};
			return (await this.transporter.sendMail(mailOptions)).response;
		} catch (err) {
			console.log(err);
			return 'Internal Server Error';
		}
	}
	static async changePassword(req: Request) {
		try {
			const token = req.body.token;
			const password = req.body.password;
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

			const currentYear = new Date().getFullYear();
			const mailOptions = {
				from: 'Étterem <matesz.adam2@gmail.com>',
				to: admin.email,
				subject: 'Kétlépcsős Hitelesítés - Étterem',
				html: `
				<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
					<div style="text-align: center; padding: 20px; background-color: #FF922C; color: white;">
						<h1 style="margin: 0; font-weight: 600; color:#eee;">Étterem</h1>
						<h2 style="margin: 10px 0 0; font-weight: 400;">Kétlépcsős Hitelesítés</h2>
					</div>
					<div style="padding: 30px; background-color: white;">
						<p style="font-size: 16px; color: #333;">Kedves <b>${admin.name || 'Admin'}</b>,</p>
						<p style="font-size: 16px; color: #333; line-height: 1.5;">A bejelentkezése majdnem kész. A folyamat befejezéséhez kattintson az alábbi gombra:</p>
						<div style="text-align: center; margin: 35px 0;">
							<a href="https://mateszadam.koyeb.app/user/auth/${token}" style="background-color: #FF922C; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px; transition: all 0.3s ease;">Bejelentkezés Megerősítése</a>
						</div>
						<p style="font-size: 14px; color: #666; border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">Ha nem Ön kezdeményezte ezt a bejelentkezést, kérjük hagyja figyelmen kívül ezt az e-mailt, vagy lépjen kapcsolatba az adminisztrátorral.</p>
					</div>
					<div style="text-align: center; padding: 15px; background-color: #f8f8f8; font-size: 12px; color: #888;">
						<p>© ${currentYear} Étterem - Minden jog fenntartva</p>
					</div>
				</div>`,
			};
			log('Sending email');
			if (
				(await this.transporter.sendMail(mailOptions)).response.includes(
					'250 2.0.0 OK'
				)
			) {
				return { token: WebSocketToken, email: admin.email };
			}
			return 'Email not sent';
		} catch (err) {
			console.log(err);
			return 'Internal Server Error';
		}
	}
	static async authAdmin(token: string) {
		try {
			if (!token || !this.adminsWaitingToAuth.find((t) => t.token === token)) {
				return 'Invalid token';
			}

			webSocetController.sendStateChangeToAdmins(
				this.adminsWaitingToAuth.find((t) => t.token === token)
			);
			log(this.adminsWaitingToAuth);
			this.adminsWaitingToAuth.splice(
				this.adminsWaitingToAuth.findIndex((t) => t.token === token),
				1
			);
			log(this.adminsWaitingToAuth);

			return 'Admin authenticated';
		} catch (err) {
			console.log(err);
			return 'Internal Server Error';
		}
	}
}
