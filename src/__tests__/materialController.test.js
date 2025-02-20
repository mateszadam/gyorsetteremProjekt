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
		it('should not add a new material without message', async () => {
			const response = await request(baseUrl)
				.post('/material/add')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'TestMaterial',
					quantity: 10,
				});
			expect(response.status).toBe(400);
			expect(response.body.message).toBe('Message is required!');
		});
	});

	describe('02 GET /material/stock', () => {
		it('should get all materials in stock', async () => {
			const response = await request(baseUrl)
				.get('/material/stock')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);

			expect(response.body.length).toBeGreaterThan(0);
			response.body.forEach((material) => {
				expect(material).toEqual({
					_id: expect.any(String),
					inStock: expect.any(Number),
					unit: null,
				});
			});
		});
	});
	describe('03 GET /material/all', () => {
		it('should get all materials from foods', async () => {
			const response = await request(baseUrl)
				.get('/material/stock')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
			expect(response.body.length).toBeGreaterThan(0);
			response.body.forEach((material) => {
				expect(material).toEqual({
					_id: expect.any(String),
					inStock: expect.any(Number),
					unit: null,
				});
			});
		});
	});
});
