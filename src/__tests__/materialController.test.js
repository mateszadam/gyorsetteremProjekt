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
	describe('04 GET /material/changes', () => {
		it('should get all material changes', async () => {
			const response = await request(baseUrl)
				.get('/material/changes')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
			expect(response.body.length).toBeGreaterThan(0);
			response.body.forEach((change) => {
				expect(change).toEqual({
					_id: expect.any(String),
					name: expect.any(String),
					quantity: expect.any(Number),
					message: expect.any(String),
					date: expect.any(String),
				});
			});
		});
	});

	let materialId = '';
	describe('05 PUT /material/update/:id', () => {
		beforeAll(async () => {
			await request(baseUrl)
				.post('/material/add')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'TestMaterial',
					quantity: 10,
					message: 'Test',
				});
			materialId = await request(baseUrl)
				.get('/material/changes')
				.set('Authorization', `Bearer ${token}`)
				.then((response) => response.body[0]._id);
		});
		it('should update a material', async () => {
			const response = await request(baseUrl)
				.patch(`/material/update/${materialId}`)
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'UpdatedMaterial',
					quantity: 20,
					message: 'Updated',
				});
			expect(response.status).toBe(200);
		});

		it('should not update a material with invalid id', async () => {
			const response = await request(baseUrl)
				.patch('/material/update/invalidId')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'UpdatedMaterial',
					quantity: 20,
					message: 'Updated',
				});
			expect(response.status).toBe(400);
			expect(response.body.message).toBe('The provided ID is invalid!');
		});

		it('should not update a material without required fields', async () => {
			const response = await request(baseUrl)
				.patch(`/material/update/${materialId}`)
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(400);
			expect(response.body.message).toBe(
				'No data to be changed found in the request!'
			);
		});
	});
	describe('06 GET /material/filter', () => {
		it('should filter materials by field and value', async () => {
			const response = await request(baseUrl)
				.get('/material/filter')
				.set('Authorization', `Bearer ${token}`)
				.query({ field: 'name', value: 'TestMaterial' });
			expect(response.status).toBe(200);
			expect(response.body.length).toBeGreaterThan(0);
			response.body.forEach((material) => {
				expect(material.name).toBe('testmaterial');
			});
		});

		it('should return error if field or value is missing', async () => {
			const response = await request(baseUrl)
				.get('/material/filter')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(400);
			expect(response.body.message).toBe(
				'The search condition is not found in the URL!'
			);
		});

		it('should return error if no materials match the filter', async () => {
			const response = await request(baseUrl)
				.get('/material/filter')
				.set('Authorization', `Bearer ${token}`)
				.query({ field: 'name', value: 'NonExistentMaterial' });
			expect(response.status).toBe(400);
			expect(response.body.message).toBe(
				'No result in the database for the search condition!'
			);
		});
	});
});
