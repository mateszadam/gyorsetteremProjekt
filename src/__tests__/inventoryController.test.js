const { error } = require('console');
const request = require('supertest');
require('dotenv').config();

const baseUrl = process.env.BASE_URL;
let token = '';
let materialId = '';
let inventoryId = '';
let changeId = '';
describe('inventoryController Integration Tests', () => {
	beforeAll(async () => {
		await request(baseUrl).post('/drop');

		const response = await request(baseUrl)
			.post('/user/login')
			.send({ name: 'adminUser', password: 'adminUser!1' });

		token = response.body.token;

		await request(baseUrl)
			.post('/material')
			.set('Authorization', `Bearer ${token}`)
			.send({ name: 'TestMaterial', englishName: 'TestMaterial', unit: 'kg' });

		const mat = await request(baseUrl)
			.get('/material')
			.set('Authorization', `Bearer ${token}`);
		materialId = mat.body.items[0]._id;

		await request(baseUrl)
			.post('/inventory')
			.set('Authorization', `Bearer ${token}`)
			.send({ name: 'TestMaterial', quantity: 10, message: 'Initial stock' });
		const res = await request(baseUrl)
			.get('/inventory')
			.set('Authorization', `Bearer ${token}`);
		inventoryId = res.body.items[0]._id;
		changeId = res.body.items[0].materialId;
	});

	describe('01 POST /inventory', () => {
		it('should add a new material change', async () => {
			const response = await request(baseUrl)
				.post('/inventory')
				.set('Authorization', `Bearer ${token}`)
				.send({ name: 'TestMaterial', quantity: 10, message: 'Initial stock' });
			expect(response.status).toBe(201);
		});
	});

	describe('02 GET /inventory', () => {
		it('should get all material changes', async () => {
			const response = await request(baseUrl)
				.get('/inventory')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
			expect(response.body.items.length).toBeGreaterThan(0);
			response.body.items.forEach((item) => {
				expect(item).toEqual({
					_id: expect.any(String),
					materialId: expect.any(String),
					quantity: expect.any(Number),
				});
			});
		});
	});

	describe('03 PUT /inventory/:id', () => {
		it('should update the material change by id', async () => {
			const newQuantity = 20;

			const invResponse = await request(baseUrl)
				.get(`/inventory/changes`)
				.set('Authorization', `Bearer ${token}`);
			const inventoryId = invResponse.body.items[0]._id;

			const response = await request(baseUrl)
				.put(`/inventory/${inventoryId}`)
				.set('Authorization', `Bearer ${token}`)
				.send({ quantity: newQuantity });

			expect(response.status).toBe(200);
		});
	});

	describe('04 DELETE /inventory/:id', () => {
		it('should delete the material change by id', async () => {
			const invResponse = await request(baseUrl)
				.get(`/inventory/changes`)
				.set('Authorization', `Bearer ${token}`);
			const inventoryId = invResponse.body.items[0]._id;
			const response = await request(baseUrl)
				.delete(`/inventory/${inventoryId}`)
				.set('Authorization', `Bearer ${token}`);

			expect(response.status).toBe(200);
		});
	});
});
