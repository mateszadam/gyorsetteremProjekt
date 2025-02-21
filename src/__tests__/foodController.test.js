const { error } = require('console');
const request = require('supertest');
require('dotenv').config();

const baseUrl = process.env.BASE_URL;
let token = '';
let catId = '';

describe('foodController Integration Tests', () => {
	beforeAll(async () => {
		const response = await request(baseUrl).post('/user/login').send({
			name: 'adminUser',
			password: 'adminUser!1',
		});
		token = response.body.token;
		const response1 = await request(baseUrl)
			.get('/food/all')
			.set('Authorization', `Bearer ${token}`);
		if (response1.body.length > 0) {
			response1.body.forEach(async (food) => {
				await request(baseUrl)
					.delete(`/food/name/${food.name}`)
					.set('Authorization', `Bearer ${token}`);
			});
		}
	});
	describe('01 POST /food/add', () => {
		it('should add a new food item', async () => {
			await request(baseUrl)
				.post('/material/add')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'Liszt',
					quantity: 3,
					message: 'Test',
				});
			await request(baseUrl)
				.post('/category/add')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'string',
					icon: 'no-image.svg',
				});

			const category = await request(baseUrl)
				.get('/category/all')
				.set('Authorization', `Bearer ${token}`)
				.send();
			catId = category.body[0]._id;

			const response = await request(baseUrl)
				.post('/food/add')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'TestFood',
					price: 10,
					materials: [{ name: 'liszt', quantity: 1 }],
					categoryId: catId,
					subCategoryId: [catId],
					image: 'no-image',
				});
			expect(response.status).toBe(200);
		});
	});

	describe('02 GET /food/allEnabled', () => {
		it('should get all enabled food items', async () => {
			const response = await request(baseUrl)
				.get('/food/allEnabled')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
			response.body.forEach((item) => {
				expect(item).toEqual(expect.objectContaining({ isEnabled: true }));
			});
		});
	});

	describe('03 GET /food/all', () => {
		it('should get all food items', async () => {
			const response = await request(baseUrl)
				.get('/food/all')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
			expect(response.body).toEqual(
				expect.arrayContaining([expect.objectContaining({ name: 'TestFood' })])
			);
		});
	});

	describe('04 GET /food/allToOrder', () => {
		it('should get all food items to order', async () => {
			const response = await request(baseUrl)
				.get('/food/all')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
			expect(response.body).toEqual(
				expect.arrayContaining([expect.objectContaining({ name: 'TestFood' })])
			);
		});
	});

	describe('05 GET /food/name/:name', () => {
		it('should get a food item by name', async () => {
			const response = await request(baseUrl)
				.get('/food/name/TestFood')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
			expect(response.body).toEqual({
				_id: expect.any(String),
				name: 'TestFood',
				materials: [
					{
						name: 'liszt',
						quantity: 1,
						id: null,
					},
				],
				price: 10,
				isEnabled: true,
				categoryId: {
					name: 'string',
					icon: 'no-image.svg',
				},

				subCategoryId: [
					{
						name: 'string',
						icon: 'no-image.svg',
					},
				],
				image: 'no-image',
			});
		});
	});

	describe('06 GET /food/category/:category', () => {
		it('should get food items by category', async () => {
			const response = await request(baseUrl)
				.get('/food/category/string')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);

			response.body.forEach((item) => {
				expect(item).toEqual({
					subCategoryId: [
						{
							name: 'string',
							icon: 'no-image.svg',
						},
					],
					_id: expect.any(String),
					name: expect.any(String),
					price: expect.any(Number),
					materials: expect.any(Array),
					image: expect.any(String),
					isEnabled: expect.any(Boolean),
					categoryId: {
						name: 'string',
						icon: 'no-image.svg',
					},
				});
			});
		});
	});

	describe('07 PUT /food/update/:id', () => {
		it('should update a food item by id', async () => {
			const id = await request(baseUrl)
				.get('/food/name/TestFood')
				.set('Authorization', `Bearer ${token}`);

			const response = await request(baseUrl)
				.put(`/food/update/${id.body._id}`)
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'TestFood',
					price: 12,
					materials: [{ name: 'liszt', quantity: 2 }],
					isEnabled: true,
					subCategoryId: [catId],
					categoryId: catId,
					image: 'no-image',
				});
			expect(response.status).toBe(200);
			expect(
				(
					await request(baseUrl)
						.get('/food/name/TestFood')
						.set('Authorization', `Bearer ${token}`)
				).body
			).toEqual({
				_id: expect.any(String),
				name: 'TestFood',
				materials: [
					{
						name: 'liszt',
						quantity: 2,
						id: null,
					},
				],
				price: 12,
				isEnabled: true,
				subCategoryId: [
					{
						name: 'string',
						icon: 'no-image.svg',
					},
				],
				categoryId: {
					name: 'string',
					icon: 'no-image.svg',
				},
				image: 'no-image',
			});
		});
	});

	describe('08 PATCH /food/disable/:name', () => {
		it('should disable a food item by name', async () => {
			const response = await request(baseUrl)
				.patch('/food/disable/TestFood')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);

			expect(
				(
					await request(baseUrl)
						.get('/food/name/TestFood')
						.set('Authorization', `Bearer ${token}`)
				).body
			).toEqual({
				subCategoryId: expect.any(Array),
				_id: expect.any(String),
				name: expect.any(String),
				price: expect.any(Number),
				materials: expect.any(Array),
				image: expect.any(String),
				isEnabled: false,
				categoryId: expect.any(Object),
			});
		});
	});

	describe('09 PATCH /food/enable/:name', () => {
		it('should enable a food item by name', async () => {
			const response = await request(baseUrl)
				.patch('/food/enable/TestFood')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);

			expect(
				(
					await request(baseUrl)
						.get('/food/name/TestFood')
						.set('Authorization', `Bearer ${token}`)
				).body
			).toEqual({
				subCategoryId: expect.any(Array),
				categoryId: expect.any(Object),
				_id: expect.any(String),
				name: expect.any(String),
				price: expect.any(Number),
				materials: expect.any(Array),
				image: expect.any(String),
				isEnabled: true,
			});
		});
	});
	describe('10 DELETE /food/name/:name', () => {
		it('should delete a food item by name', async () => {
			const response = await request(baseUrl)
				.delete('/food/name/TestFood')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
			expect(
				(
					await request(baseUrl)
						.get('/food/name/TestFood')
						.set('Authorization', `Bearer ${token}`)
				).status
			).toBe(400);
		});
	});
});
