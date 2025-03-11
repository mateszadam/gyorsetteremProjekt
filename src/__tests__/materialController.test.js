const exp = require('constants');
const e = require('cors');
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
			expect(
				(
					await request(baseUrl)
						.get('/material')
						.set('Authorization', `Bearer ${token}`)
						.query({ name: 'TestMaterial' })
				).body.items[0]
			).toEqual({
				_id: expect.any(String),
				name: 'testmaterial',
				englishName: 'testmaterial',
				inStock: 0,
				isEnough: false,
				unit: 'kg',
				usageOneWeekAgo: 0,
			});
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
		beforeAll(async () => {
			let materialUnit = '';
			for (let i = 0; i < 15; i++) {
				if (i % 2 === 0) {
					materialUnit = 'db';
				} else {
					materialUnit = 'kg';
				}
				await request(baseUrl)
					.post('/material')
					.set('Authorization', `Bearer ${token}`)
					.send({
						name: `TestMaterial${i}`,
						englishName: `TestMaterial${i}`,
						unit: materialUnit,
					});
			}
		}, 20000);
		it('should get all materials', async () => {
			const response = await request(baseUrl)
				.get('/material')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
			expect(response.body.items.length).toBe(10);
			expect(response.body.pageCount).toBe(2);
			response.body.items.forEach((material) => {
				expect(material).toEqual({
					_id: expect.any(String),
					name: expect.any(String),
					englishName: expect.any(String),
					unit: expect.any(String),
					inStock: expect.any(Number),
					isEnough: expect.any(Boolean),
					unit: expect.any(String),
					usageOneWeekAgo: expect.any(Number),
				});
			});
		});

		it('should get materials by field and value', async () => {
			const response = await request(baseUrl)
				.get('/material')
				.set('Authorization', `Bearer ${token}`)
				.query({ unit: 'kg', page: 1 });
			expect(response.status).toBe(200);
			expect(response.body.items.length).toBe(8);
			expect(response.body.pageCount).toBe(1);
			response.body.items.forEach((material) => {
				expect(material.unit).toBe('kg');
			});
		});

		it('should return [] if no materials match the query', async () => {
			const response = await request(baseUrl)
				.get('/material')
				.set('Authorization', `Bearer ${token}`)
				.query({ name: 'NonExistentMaterial', page: 1 });
			expect(response.status).toBe(200);
		});

		it('should paginate materials', async () => {
			const response = await request(baseUrl)
				.get('/material')
				.set('Authorization', `Bearer ${token}`)
				.query({ page: 1, limit: 2 });
			expect(response.status).toBe(200);
			expect(response.body.items.length).toBe(2);
			expect(response.body.pageCount).toBe(8);
		});

		it('should paginate with filter, limit, and page ', async () => {
			const response = await request(baseUrl)
				.get('/material')
				.set('Authorization', `Bearer ${token}`)
				.query({ unit: 'kg', page: 2, limit: 5 });
			expect(response.status).toBe(200);
			expect(response.body.items.length).toBe(3);
			expect(response.body.pageCount).toBe(2);
		});

		it('should return 200 if page number exceeds total pages', async () => {
			const response = await request(baseUrl)
				.get('/material')
				.set('Authorization', `Bearer ${token}`)
				.query({ page: 999 });
			expect(response.status).toBe(200);
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
				.set('Authorization', `Bearer ${token}`)
				.query({ name: 'testmaterial' });
			materialId = response.body.items[0]._id;
		});

		it('should delete a material by id', async () => {
			const material = await request(baseUrl)
				.get('/material')
				.set('Authorization', `Bearer ${token}`)
				.query({ name: 'testmaterial11' });
			materialId = material.body.items[0]._id;
			const response = await request(baseUrl)
				.delete(`/material/${materialId}`)
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
			expect(response.body).toEqual({
				_id: materialId,
				name: 'testmaterial11',
				englishName: 'testmaterial11',
				unit: 'kg',
			});
		});

		it('should not delete a material with invalid id', async () => {
			const response = await request(baseUrl)
				.delete('/material/invalidId')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(400);
			expect(response.body.message).toBe('The provided ID is invalid!');
		});
	});

	describe('04 PUT /material/:id', () => {
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
				.put(`/material/${materialId}`)
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'UpdatedMaterial',
					englishName: 'UpdatedMaterial',
					unit: 'g',
				});
			expect(response.status).toBe(200);
			expect(response.body.name).toBe('updatedmaterial');
			expect(response.body.unit).toBe('g');

			expect(
				(
					await request(baseUrl)
						.get(`/material`)
						.set('Authorization', `Bearer ${token}`)
						.query({ _id: materialId })
				).body.items
			).toEqual([
				{
					_id: materialId,
					name: 'updatedmaterial',
					englishName: 'updatedmaterial',
					unit: 'g',
					inStock: expect.any(Number),
					isEnough: expect.any(Boolean),
					usageOneWeekAgo: expect.any(Number),
				},
			]);
		});

		it('should not update a material with invalid id', async () => {
			const response = await request(baseUrl)
				.put('/material/67bf345ee82353e877b1f657')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'UpdatedMaterial',
					englishName: 'UpdatedMaterial',
					unit: 'g',
				});
			expect(response.status).toBe(400);
			expect(response.body.message).toBe('User ID not found in the database!');
		});

		it('should return 400 if no material data is provided', async () => {
			const response = await request(baseUrl)
				.put(`/material/${materialId}`)
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(400);
			expect(response.body.message).toBe('At least one change is required!');
		});
	});
});
