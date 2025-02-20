const request = require('supertest');
require('dotenv').config();

const baseUrl = process.env.BASE_URL;
let token = '';

describe('categoryController Integration Tests', () => {
	describe('01 POST /category/add', () => {
		it('should add a new category', async () => {
			const response = await request(baseUrl)
				.post('/category/add')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'TestCategory',
					icon: 'test-icon.svg',
				});
			expect(response.status).toBe(200);
		});
	});

	describe('02 GET /category/all', () => {
		it('should get all categories', async () => {
			const response = await request(baseUrl)
				.get('/category/all')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
		});
	});
});
