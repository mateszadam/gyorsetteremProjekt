const request = require('supertest');
require('dotenv').config();

const baseUrl = process.env.BASE_URL;
let token = '';

describe('tokenValidationController Integration Tests', () => {
	beforeAll(async () => {
		await request(baseUrl).post('/drop');

		const response = await request(baseUrl).post('/user/login').send({
			name: 'adminUser',
			password: 'adminUser!1',
		});
		token = response.body.token;
	});
	describe('01 GET /token/validate', () => {
		it('should validate the token', async () => {
			const response = await request(baseUrl)
				.get('/token/validate')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
		});
		it('token should be invalid', async () => {
			const response = await request(baseUrl)
				.get('/token/validate')
				.set('Authorization', `Bearer almafa`);
			expect(response.status).toBe(400);
		});
	});
});
