import { Router } from 'express';
import { IController } from '../models/models';
import { log } from 'console';

export default class googleController implements IController {
	public router = Router();
	public endPoint = '/auth';

	private CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
	private CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
	private REDIRECT_URI = '<https://mateszadam.koyeb.app/auth/google/callback>';
	axios = require('axios');
	constructor() {
		this.router.get('/google', (req, res) => {
			const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${this.CLIENT_ID}&redirect_uri=${this.REDIRECT_URI}&response_type=code&scope=profile email`;
			res.redirect(url);
		});

		// Callback URL for handling the Google Login response
		this.router.get('/google/callback', async (req, res) => {
			const { code } = req.query;

			try {
				// Exchange authorization code for access token
				const { data } = await this.axios.post(
					'<https://oauth2.googleapis.com/token>',
					{
						client_id: this.CLIENT_ID,
						client_secret: this.CLIENT_SECRET,
						code,
						redirect_uri: this.REDIRECT_URI,
						grant_type: 'authorization_code',
					}
				);

				const { access_token, id_token } = data;

				// Use access_token or id_token to fetch user profile
				const { data: profile } = await this.axios.get(
					'<https://www.googleapis.com/oauth2/v1/userinfo>',
					{
						headers: { Authorization: `Bearer ${access_token}` },
					}
				);

				// Code to handle user authentication and retrieval using the profile data
				// For example, save the user profile to the database

				log(profile);

				res.redirect('/');
			} catch (error: any) {
				console.error('Error:', error.response.data.error);
				res.redirect('/login');
			}
		});
	}
}
