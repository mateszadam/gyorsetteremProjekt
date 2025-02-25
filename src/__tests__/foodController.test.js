const { error } = require('console');
const e = require('cors');
const request = require('supertest');
require('dotenv').config();

const baseUrl = process.env.BASE_URL;
let token = '';
let catId = '';

describe('foodController Integration Tests', () => {
	beforeAll(async () => {
		await request(baseUrl).post('/drop');

		const response = await request(baseUrl).post('/user/login').send({
			name: 'adminUser',
			password: 'adminUser!1',
		});
		token = response.body.token;
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
					englishName: 'string',
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
					englishName: 'TestFood',
					price: 10,
					materials: [{ name: 'liszt', quantity: 1 }],
					categoryId: catId,
					subCategoryId: [catId],
					image: 'no-image',
				});
			expect(response.status).toBe(200);
		});

		it('should add a new food item with special name', async () => {
			const category = await request(baseUrl)
				.get('/category/all')
				.set('Authorization', `Bearer ${token}`)
				.send();
			catId = category.body[0]._id;

			const response = await request(baseUrl)
				.post('/food/add')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'Test Fooddőóüö',
					englishName: 'TestFood',
					price: 10,
					materials: [{ name: 'liszt', quantity: 1 }],
					categoryId: catId,
					subCategoryId: [catId],
					image: 'no-image',
				});
			expect(response.status).toBe(200);
		});

		it('should not add a new food item without name', async () => {
			const response = await request(baseUrl)
				.post('/food/add')
				.set('Authorization', `Bearer ${token}`)
				.send({
					price: 10,
					englishName: 'TestFood',
					materials: [{ name: 'liszt', quantity: 1 }],
					categoryId: catId,
					subCategoryId: [catId],
					image: 'no-image',
				});
			expect(response.status).toBe(400);
			expect(response.body.message).toBe('Name is required');
		});
		it('should not add a new food item without price', async () => {
			const response = await request(baseUrl)
				.post('/food/add')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'TestFood',
					materials: [{ name: 'liszt', quantity: 1 }],
					categoryId: catId,
					subCategoryId: [catId],
					image: 'no-image',
				});
			expect(response.status).toBe(400);
			expect(response.body.message).toBe('Price is required.');
		});
		it('should not add a new food item without materials', async () => {
			const response = await request(baseUrl)
				.post('/food/add')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'TestFood',
					price: 10,
					categoryId: catId,
					subCategoryId: [catId],
					image: 'no-image',
				});
			expect(response.status).toBe(400);
			expect(response.body.message).toBe('Ingredients are required.');
		});
		it('should not add a new food item without category', async () => {
			const response = await request(baseUrl)
				.post('/food/add')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'TestFood',
					price: 10,
					materials: [{ name: 'liszt', quantity: 1 }],
					subCategoryId: [catId],
					image: 'no-image',
				});
			expect(response.status).toBe(400);
			expect(response.body.message).toBe('Category is required.');
		});
		it('should not add a new food item without subCategory', async () => {
			const response = await request(baseUrl)
				.post('/food/add')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'TestFood',
					price: 10,
					materials: [{ name: 'liszt', quantity: 1 }],
					categoryId: catId,
					image: 'no-image',
				});
			expect(response.status).toBe(400);
			expect(response.body.message).toBe('Subcategory is required!');
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
		it('should not get without token', async () => {
			const response = await request(baseUrl).get('/food/allEnabled');
			expect(response.status).toBe(401);
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
		it('should not get without token', async () => {
			const response = await request(baseUrl).get('/food/all');
			expect(response.status).toBe(401);
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
		it('should not get without token', async () => {
			const response = await request(baseUrl).get('/food/all');
			expect(response.status).toBe(401);
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
				englishName: 'TestFood',
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
					englishName: 'string',

					icon: 'no-image.svg',
				},

				subCategoryId: [
					{
						name: 'string',
						icon: 'no-image.svg',
						englishName: 'string',
					},
				],
				image: 'no-image',
			});
		});
		it('should not get without token', async () => {
			const response = await request(baseUrl).get('/food/name/TestFood');
			expect(response.status).toBe(401);
		});
		it('should not get with wrong name', async () => {
			const response = await request(baseUrl)
				.get('/food/name/TestFood1')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(400);
			expect(response.body.message).toBe('The food is not in database!');
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
							englishName: 'string',
						},
					],
					_id: expect.any(String),
					name: expect.any(String),
					price: expect.any(Number),
					materials: expect.any(Array),
					image: expect.any(String),
					englishName: expect.any(String),
					isEnabled: expect.any(Boolean),
					categoryId: {
						name: 'string',
						icon: 'no-image.svg',
						englishName: 'string',
					},
				});
			});
		});

		it('should not get with wrong category', async () => {
			const response = await request(baseUrl)
				.get('/food/category/string1')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(400);
			expect(response.body.message).toBe('Category not found in the database!');
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
					englishName: 'TestFood',
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
						englishName: 'string',
					},
				],
				categoryId: {
					name: 'string',
					icon: 'no-image.svg',
					englishName: 'string',
				},
				image: 'no-image',
				englishName: 'TestFood',
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
				englishName: expect.any(String),
			});
		});
		it('should not disable a food item with a wrong name', async () => {
			const response = await request(baseUrl)
				.patch('/food/disable/asd')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(400);
			expect(response.body.message).toBe('The food is not in database!');
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
				englishName: expect.any(String),
			});
		});
		it('should not enable a food item with a wrong name', async () => {
			const response = await request(baseUrl)
				.patch('/food/enable/asd')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(400);
			expect(response.body.message).toBe('The food is not in database!');
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
	describe('11 GET /food/filter', () => {
		it('should filter food items by field and value', async () => {
			await request(baseUrl)
				.post('/food/add')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'TestFood',
					price: 10,
					materials: [{ name: 'liszt', quantity: 1 }],
					categoryId: catId,
					subCategoryId: [catId],
					image: 'no-image',
					englishName: 'TestFood',
				});

			const response = await request(baseUrl)
				.get('/food/filter')
				.set('Authorization', `Bearer ${token}`)
				.query({ field: 'materials.name', value: 'liszt' });
			expect(response.status).toBe(200);
			expect(response.body).toEqual(
				expect.arrayContaining([expect.objectContaining({ name: 'TestFood' })])
			);
		});

		it('should return 400 if field is missing', async () => {
			const response = await request(baseUrl)
				.get('/food/filter')
				.set('Authorization', `Bearer ${token}`)
				.query({ value: 'TestFood' });
			expect(response.status).toBe(400);
			expect(response.body.message).toBe(
				'The search condition is not found in the URL!'
			);
		});

		it('should return 400 if value is missing', async () => {
			const response = await request(baseUrl)
				.get('/food/filter')
				.set('Authorization', `Bearer ${token}`)
				.query({ field: 'name' });
			expect(response.status).toBe(400);
			expect(response.body.message).toBe(
				'The search condition is not found in the URL!'
			);
		});

		it('should return 400 if no items match the filter', async () => {
			const response = await request(baseUrl)
				.get('/food/filter')
				.set('Authorization', `Bearer ${token}`)
				.query({ field: 'name', value: 'NonExistentFood' });
			expect(response.status).toBe(400);
			expect(response.body.message).toBe(
				'No result in the database for the search condition!'
			);
		});
	});
});
