const request = require('supertest');
require('dotenv').config();

const baseUrl = process.env.BASE_URL;
let token = '';

describe('materialController Integration Tests', () => {
	beforeAll(async () => {
		await request(baseUrl).post('/drop');

		const response = await request(baseUrl).post('/user/login').send({
			name: 'adminUser',
			password: 'adminUser!1',
		});
		token = response.body.token;
	});

	describe('01 POST /material', () => {
		it('should add a new material', async () => {
			const response = await request(baseUrl)
				.post('/material')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'TestMaterial',
					englishName: 'TestMaterial',
					unit: 'kg',
				});
			expect(response.status).toBe(200);
		});

		it('should not add a new material without required fields', async () => {
			const response = await request(baseUrl)
				.post('/material')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'TestMaterial',
				});
			expect(response.status).toBe(400);
			expect(response.body.message).toBe('Name is required');
		});
	});

	describe('02 GET /material', () => {
		it('should get all materials', async () => {
			const response = await request(baseUrl)
				.get('/material')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
			expect(response.body.items.length).toBeGreaterThan(0);
			response.body.items.forEach((material) => {
				expect(material).toEqual({
					_id: expect.any(String),
					name: expect.any(String),
					englishName: expect.any(String),
					unit: expect.any(String),
				});
			});
		});
	});

	let materialId = '';
	describe('03 DELETE /material/:id', () => {
		beforeAll(async () => {
			await request(baseUrl)
				.post('/material')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'TestMaterial',
					englishName: 'TestMaterial',
					unit: 'kg',
				});
			const response = await request(baseUrl)
				.get('/material')
				.set('Authorization', `Bearer ${token}`);
			materialId = response.body.items[0]._id;
		});

		it('should delete a material by id', async () => {
			const response = await request(baseUrl)
				.delete(`/material/${materialId}`)
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
		});

		it('should not delete a material with invalid id', async () => {
			const response = await request(baseUrl)
				.delete('/material/invalidId')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(400);
			expect(response.body.message).toBe('The provided ID is invalid!');
		});
	});

	describe('04 PATCH /material/:id', () => {
		beforeAll(async () => {
			await request(baseUrl)
				.post('/material')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'TestMaterial',
					englishName: 'TestMaterial',
					unit: 'kg',
				});

			const response = await request(baseUrl)
				.get('/material')
				.set('Authorization', `Bearer ${token}`);
			materialId = response.body.items[0]._id;
		});

		it('should update a material', async () => {
			const response = await request(baseUrl)
				.patch(`/material/${materialId}`)
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'UpdatedMaterial',
					englishName: 'UpdatedMaterial',
					unit: 'g',
				});
			expect(response.status).toBe(200);
		});

		it('should not update a material with invalid id', async () => {
			const response = await request(baseUrl)
				.patch('/material/invalidId')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'UpdatedMaterial',
					englishName: 'UpdatedMaterial',
					unit: 'g',
				});
			expect(response.status).toBe(400);
			expect(response.body.message).toBe('The provided ID is invalid!');
		});
	});
});
