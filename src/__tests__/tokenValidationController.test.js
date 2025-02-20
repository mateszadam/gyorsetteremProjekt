const request = require('supertest');
require('dotenv').config();

const baseUrl = process.env.BASE_URL;
let token = '';

describe('tokenValidationController Integration Tests', () => {
	describe('01 GET /token/validate', () => {
		it('should validate the token', async () => {
			const response = await request(baseUrl)
				.get('/token/validate')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
		});
	});
});
