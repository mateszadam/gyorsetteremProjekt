const request = require('supertest');
require('dotenv').config();

const baseUrl = process.env.BASE_URL;
let token = '';

describe('unitController Integration Tests', () => {
	describe('01 POST /unit/add', () => {
		it('should add a new unit', async () => {
			const response = await request(baseUrl)
				.post('/unit/add')
				.set('Authorization', `Bearer ${token}`)
				.send({
					materialName: 'TestMaterial',
					unit: 'kg',
				});
			expect(response.status).toBe(200);
		});
	});

	describe('02 GET /unit/all', () => {
		it('should get all units', async () => {
			const response = await request(baseUrl)
				.get('/unit/all')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
		});
	});
});
