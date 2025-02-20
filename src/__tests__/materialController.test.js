const request = require('supertest');
require('dotenv').config();

const baseUrl = process.env.BASE_URL;
let token = '';

describe('materialController Integration Tests', () => {
	describe('01 POST /material/add', () => {
		it('should add a new material', async () => {
			const response = await request(baseUrl)
				.post('/material/add')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'TestMaterial',
					quantity: 10,
					message: 'Test',
				});
			expect(response.status).toBe(200);
		});
	});

	describe('02 GET /material/stock', () => {
		it('should get all materials in stock', async () => {
			const response = await request(baseUrl)
				.get('/material/stock')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
		});
	});
});
