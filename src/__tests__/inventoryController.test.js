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
		it('should not add a new material change without name', async () => {
			const response = await request(baseUrl)
				.post('/inventory')
				.set('Authorization', `Bearer ${token}`)
				.send({ quantity: 10, message: 'Initial stock' });
			expect(response.status).toBe(400);
		});
		it('should not add a new material change without quantity', async () => {
			const response = await request(baseUrl)
				.post('/inventory')
				.set('Authorization', `Bearer ${token}`)
				.send({ name: 'TestMaterial', message: 'Initial stock' });
			expect(response.status).toBe(400);
		});
		it('should not add a new material change without message', async () => {
			const response = await request(baseUrl)
				.post('/inventory')
				.set('Authorization', `Bearer ${token}`)
				.send({ name: 'TestMaterial', quantity: 10 });
			expect(response.status).toBe(400);
		});
		it('should add material with id', async () => {
			const response = await request(baseUrl)
				.post('/inventory')
				.set('Authorization', `Bearer ${token}`)
				.send({
					materialId: materialId,
					quantity: 10,
					message: 'Initial stock',
				});
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
					englishName: expect.any(String),
					name: expect.any(String),
					unit: expect.any(String),
					inStock: expect.any(Number),
				});
			});
		});

		it('should get stock with pagination', async () => {
			const response = await request(baseUrl)
				.get('/inventory?page=1')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
			expect(response.body.items.length).toBeLessThanOrEqual(10);
			expect(response.body.pageCount).toEqual(1);
		});

		it('should get stock filtered by field and value', async () => {
			const response = await request(baseUrl)
				.get('/inventory?field=name&value=testmaterial')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
			expect(response.body.items.length).toBeGreaterThan(0);
			response.body.items.forEach((item) => {
				expect(item.name).toBe('testmaterial');
			});
		});

		it('should return 400 if page is not a number', async () => {
			const response = await request(baseUrl)
				.get('/inventory')
				.set('Authorization', `Bearer ${token}`)
				.query({
					page: 'abc',
				});
			expect(response.status).toBe(200);
		});
		it('should return page with more items', async () => {
			for (let i = 0; i < 10; i++) {
				const a = await request(baseUrl)
					.post('/material')
					.set('Authorization', `Bearer ${token}`)
					.send({
						name: 'TestMaterial' + i,
						englishName: 'TestMaterial',
						unit: 'kg',
					});
				const b = await request(baseUrl)
					.post('/inventory')
					.set('Authorization', `Bearer ${token}`)
					.send({
						name: 'TestMaterial' + i,
						quantity: 10,
						message: 'Initial stock',
					});
			}
			const response = await request(baseUrl)
				.get('/inventory')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
			expect(response.body.items.length).toBe(10);
			expect(response.body.pageCount).toEqual(2);
		});
		it('should return items on second page', async () => {
			const response = await request(baseUrl)
				.get('/inventory')
				.set('Authorization', `Bearer ${token}`)
				.query({
					page: 2,
				});
			expect(response.status).toBe(200);
			expect(response.body.items.length).toBe(1);
			expect(response.body.pageCount).toEqual(2);
		});
		it('should get stock with limit', async () => {
			const response = await request(baseUrl)
				.get('/inventory')
				.set('Authorization', `Bearer ${token}`)
				.query({
					limit: 1,
				});
			expect(response.status).toBe(200);
			expect(response.body.items.length).toBe(1);
			expect(response.body.pageCount).toEqual(11);
		});
	});

	describe('03 PUT /inventory/:id', () => {
		it('should update the material change by id', async () => {
			const inventory = await request(baseUrl)
				.get(`/inventory/changes`)
				.set('Authorization', `Bearer ${token}`);
			const inventoryId = inventory.body.items[0]._id;

			const response = await request(baseUrl)
				.put(`/inventory/${inventoryId}`)
				.set('Authorization', `Bearer ${token}`)
				.send({ quantity: 300, message: 'Updated stock' });

			expect(response.status).toBe(200);
			expect(response.body.quantity).toBe(300);
			expect(response.body.message).toBe('Updated stock');
			expect(
				(
					await request(baseUrl)
						.get(`/inventory/changes`)
						.set('Authorization', `Bearer ${token}`)
						.query({ field: '_id', value: response.body._id })
				).body.items[0].quantity
			).toBe(300);
		});

		it('should not update the material change with invalid id', async () => {
			const response = await request(baseUrl)
				.put(`/inventory/invalidId`)
				.set('Authorization', `Bearer ${token}`)
				.send({ quantity: 20, message: 'Updated stock' });

			expect(response.status).toBe(400);
		});

		it('should not update the material change without quantity', async () => {
			const response = await request(baseUrl)
				.put(`/inventory/${inventoryId}`)
				.set('Authorization', `Bearer ${token}`)
				.send({ message: 'Updated stock' });

			expect(response.status).toBe(400);
		});

		it('should not update the material change without message', async () => {
			const response = await request(baseUrl)
				.put(`/inventory/${inventoryId}`)
				.set('Authorization', `Bearer ${token}`)
				.send({ quantity: 20 });

			expect(response.status).toBe(400);
		});

		it('should not update the material change with empty fields', async () => {
			const response = await request(baseUrl)
				.put(`/inventory/${inventoryId}`)
				.set('Authorization', `Bearer ${token}`)
				.send({ quantity: '', message: '' });

			expect(response.status).toBe(400);
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
			expect(
				(
					await request(baseUrl)
						.get(`/inventory/changes`)
						.set('Authorization', `Bearer ${token}`)
						.query({ field: '_id', value: inventoryId })
				).body.items.length
			).toBe(0);
		});
		it('should not delete the material change with invalid id', async () => {
			const response = await request(baseUrl)
				.delete(`/inventory/invalidId`)
				.set('Authorization', `Bearer ${token}`);

			expect(response.status).toBe(400);
		});
	});
});
