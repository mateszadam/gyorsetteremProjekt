const request = require('supertest');
require('dotenv').config();

const baseUrl = process.env.BASE_URL;
let token = '';

describe('unitController Integration Tests', () => {
	beforeAll(async () => {
		const response = await request(baseUrl).post('/user/login').send({
			name: 'adminUser',
			password: 'adminUser!1',
		});
		token = response.body.token;
	});
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
	describe('03 PUT /unit/update/:name', () => {
		it('should update the unit by material name', async () => {
			const materialName = 'TestMaterial';
			const newUnit = 'kg';

			const response = await request(baseUrl)
				.patch(`/unit/update/${materialName}`)
				.set('Authorization', `Bearer ${token}`)
				.send({ unit: newUnit });

			expect(response.status).toBe(200);

			const updatedResponse = await request(baseUrl)
				.get('/unit/all')
				.set('Authorization', `Bearer ${token}`);

			expect(updatedResponse.status).toBe(200);
			expect(updatedResponse.body).toEqual([
				{ materialName: 'testmaterial', unit: 'kg' },
			]);
		});
	});
	describe('04 DELETE /unit/delete/:name', () => {
		it('should delete the unit by material name', async () => {
			const materialName = 'TestMaterial';

			const response = await request(baseUrl)
				.delete(`/unit/delete/${materialName}`)
				.set('Authorization', `Bearer ${token}`);

			expect(response.status).toBe(200);

			const getResponse = await request(baseUrl)
				.get('/unit/all')
				.set('Authorization', `Bearer ${token}`);

			expect(getResponse.status).toBe(200);
			expect(getResponse.body).not.toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						materialName: materialName.toLowerCase(),
					}),
				])
			);
		});
	});
});
