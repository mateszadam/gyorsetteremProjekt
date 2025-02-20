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
			expect(
				(
					await request(baseUrl)
						.get('/unit/all')
						.set('Authorization', `Bearer ${token}`)
				).body
			).toEqual([{ materialName: 'testmaterial', unit: 'kg' }]);
		});
	});

	describe('02 GET /unit/all', () => {
		it('should get all units', async () => {
			const response = await request(baseUrl)
				.get('/unit/all')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
			expect(response.body.length).toBeGreaterThan(0);
			response.body.forEach((item) => {
				expect(item).toEqual({
					materialName: expect.any(String),
					unit: expect.any(String),
				});
			});
		});
	});
});
