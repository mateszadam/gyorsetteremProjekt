const { error } = require('console');

const request = require('supertest');
require('dotenv').config();

const baseUrl = process.env.BASE_URL;
let token = '';
let catId = '';
let materialId = '';
let foodId = '';

describe('foodController Integration Tests', () => {
	beforeAll(async () => {
		await request(baseUrl).post('/drop');
		const response = await request(baseUrl)
			.post('/user/login')
			.send({ name: 'adminUser', password: 'adminUser!1' });
		const newCategories = await request(baseUrl)
			.post('/category')
			.set('Authorization', `Bearer ${response.body.token}`)
			.send({
				name: 'TestCategory3',
				icon: 'test-icon.svg',
				englishName: 'TestCategory3',
			});
		catId = newCategories.body._id;

		const newMaterials = await request(baseUrl)
			.post('/material')
			.set('Authorization', `Bearer ${response.body.token}`)
			.send({ name: 'materialName', englishName: 'materialName', unit: 'kg' });

		materialId = newMaterials.body._id;

		const food = {
			name: 'Test Food3',
			price: 10,
			materials: [{ _id: materialId, quantity: 2 }],
			subCategoryId: [catId],
			categoryId: catId,
			image: 'image_url',
			isEnabled: true,
			englishName: 'Test Food English',
		};

		const newFood = await request(baseUrl)
			.post('/food')
			.set('Authorization', `Bearer ${response.body.token}`)
			.send(food);
		foodId = newFood.body._id;

		token = response.body.token;
	});
	describe('01 POST /food', () => {
		it('should add a new food item', async () => {
			const newFood = {
				name: 'Test Food',
				price: 10,
				materials: [{ _id: materialId, quantity: 2 }],
				subCategoryId: [catId],
				categoryId: catId,
				image: 'image_url',
				isEnabled: true,
				englishName: 'Test Food English',
			};

			const response = await request(baseUrl)
				.post('/food')
				.set('Authorization', `Bearer ${token}`)
				.send(newFood);

			expect(response.status).toBe(200);
			expect(response.body).toEqual({
				_id: expect.any(String),
				name: 'Test Food',
				price: 10,
				materials: [{ id: expect.any(String), _id: materialId, quantity: 2 }],
				subCategoryId: [catId],
				categoryId: catId,
				image: 'image_url',
				isEnabled: true,
				englishName: 'Test Food English',
			});
			expect(response.body.materials[0].id).toBeDefined();
			expect(
				(
					await request(baseUrl)
						.get('/food')
						.set('Authorization', `Bearer ${token}`)
				).body.items
			).toEqual(
				expect.arrayContaining([expect.objectContaining({ name: 'Test Food' })])
			);
		});

		it('should return 400 for invalid materialId', async () => {
			const newFood = {
				name: 'Test Food',
				price: 10,
				materials: [{ _id: 'materialId1', quantity: 2 }],
				subCategoryId: ['subCategoryId1'],
				categoryId: 'categoryId1',
				image: 'image_url',
				isEnabled: true,
				englishName: 'Test Food English',
			};

			const response = await request(baseUrl)
				.post('/food')
				.set('Authorization', `Bearer ${token}`)
				.send(newFood);

			expect(response.status).toBe(400);
			expect(response.body.message).toBe('The provided ID is invalid!');
		});
		it('should return 400 for invalid categoryId', async () => {
			const newFood = {
				name: 'Test Food',
				price: 10,
				materials: [{ _id: materialId, quantity: 2 }],
				subCategoryId: ['subCategoryId1'],
				categoryId: 'categoryId1',
				image: 'image_url',
				isEnabled: true,
				englishName: 'Test Food English',
			};

			const response = await request(baseUrl)
				.post('/food')
				.set('Authorization', `Bearer ${token}`)
				.send(newFood);

			expect(response.status).toBe(400);
			expect(response.body.message).toBe('The provided ID is invalid!');
		});
		it('should return 400 for invalid subCategoryId', async () => {
			const newFood = {
				name: 'Test Food',
				price: 10,
				materials: [{ _id: materialId, quantity: 2 }],
				subCategoryId: ['subCategoryId1'],
				categoryId: catId,
				image: 'image_url',
				isEnabled: true,
				englishName: 'Test Food English',
			};

			const response = await request(baseUrl)
				.post('/food')
				.set('Authorization', `Bearer ${token}`)
				.send(newFood);

			expect(response.status).toBe(400);
			expect(response.body.message).toBe('The provided ID is invalid!');
		});
		it('should return 400 for missing name', async () => {
			const newFood = {
				price: 10,
				materials: [{ _id: materialId, quantity: 2 }],
				subCategoryId: [catId],
				categoryId: catId,
				image: 'image_url',
				isEnabled: true,
				englishName: 'Test Food English',
			};

			const response = await request(baseUrl)
				.post('/food')
				.set('Authorization', `Bearer ${token}`)
				.send(newFood);

			expect(response.status).toBe(400);
			expect(response.body.message).toBe('Name is required');
		});
		it('should return 400 for negative price', async () => {
			const newFood = {
				name: 'Test Food',
				price: -10,
				materials: [{ _id: materialId, quantity: 2 }],
				subCategoryId: [catId],
				categoryId: catId,
				image: 'image_url',
				isEnabled: true,
				englishName: 'Test Food English',
			};

			const response = await request(baseUrl)
				.post('/food')
				.set('Authorization', `Bearer ${token}`)
				.send(newFood);

			expect(response.status).toBe(400);
			expect(response.body.message).toBe('The price cannot be less than 0.');
		});
		it('should return 400 in food name is occupied', async () => {
			const newFood = {
				name: 'Test Food3',
				price: 10,
				materials: [{ _id: materialId, quantity: 2 }],
				subCategoryId: [catId],
				categoryId: catId,
				image: 'image_url',
				isEnabled: true,
				englishName: 'Test Food English',
			};

			const response = await request(baseUrl)
				.post('/food')
				.set('Authorization', `Bearer ${token}`)
				.send(newFood);

			expect(response.status).toBe(400);
			expect(response.body.message).toBe('Food name already taken!');
		});
	});
	describe('03 GET /food', () => {
		it('should return a list of food items with pagination', async () => {
			const response = await request(baseUrl)
				.get('/food')
				.set('Authorization', `Bearer ${token}`)
				.query({ page: 1, limit: 10 });

			expect(response.status).toBe(200);
			expect(response.body.items).toBeInstanceOf(Array);
			expect(response.body.pageCount).toBeGreaterThanOrEqual(1);
		});

		it('should return food items filtered by name', async () => {
			const response = await request(baseUrl)
				.get('/food')
				.set('Authorization', `Bearer ${token}`)
				.query({ name: 'Test Food3' });

			expect(response.status).toBe(200);
			expect(response.body.items).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ name: 'Test Food3' }),
				])
			);
		});

		it('should return food items filtered by price range', async () => {
			const response = await request(baseUrl)
				.get('/food')
				.set('Authorization', `Bearer ${token}`)
				.query({ minPrice: 5, maxPrice: 15 });

			expect(response.status).toBe(200);
			expect(response.body.items).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ price: expect.any(Number) }),
				])
			);
		});

		it('should return 400 for invalid page or limit', async () => {
			const response = await request(baseUrl)
				.get('/food')
				.set('Authorization', `Bearer ${token}`)
				.query({ page: -1, limit: -10 });

			expect(response.status).toBe(400);
			expect(response.body.message).toBe(
				'Page number and limit must be numbers!'
			);
		});

		it('should return 400 for invalid categoryId', async () => {
			const response = await request(baseUrl)
				.get('/food')
				.set('Authorization', `Bearer ${token}`)
				.query({ categoryId: 'invalidCategoryId' });

			expect(response.status).toBe(400);
			expect(response.body.message).toBe('The provided ID is invalid!');
		});

		it('should return 400 for invalid subCategoryId', async () => {
			const response = await request(baseUrl)
				.get('/food')
				.set('Authorization', `Bearer ${token}`)
				.query({ subCategoryId: 'invalidSubCategoryId' });

			expect(response.status).toBe(400);
			expect(response.body.message).toBe('The provided ID is invalid!');
		});
	});

	describe('06 PUT /food/:id', () => {
		it('should update a food item by id', async () => {
			const newFood = {
				name: 'Test Food23',
				price: 10,
				materials: [{ _id: materialId, quantity: 2 }],
				subCategoryId: [catId],
				categoryId: catId,
				image: 'image_url',
				isEnabled: true,
				englishName: 'Test Food English',
			};
			const foodId = await request(baseUrl)
				.post('/food')
				.set('Authorization', `Bearer ${token}`)
				.send(newFood);
			const updatedFood = {
				name: 'Updated Test Food',
				price: 15,
				materials: [{ _id: materialId, quantity: 3 }],
				subCategoryId: [catId],
				categoryId: catId,
				image: 'updated_image_url',
				isEnabled: true,
				englishName: 'Updated Test Food English',
			};

			const response = await request(baseUrl)
				.put(`/food/${foodId.body._id}`)
				.set('Authorization', `Bearer ${token}`)
				.send(updatedFood);

			expect(response.status).toBe(200);
			expect(response.body).toEqual({
				_id: foodId.body._id,
				name: 'Updated Test Food',
				price: 15,
				materials: [{ id: expect.any(String), _id: materialId, quantity: 3 }],
				subCategoryId: [catId],
				categoryId: catId,
				image: 'updated_image_url',
				isEnabled: true,
				englishName: 'Updated Test Food English',
			});
			const response2 = await request(baseUrl)
				.get(`/food`)
				.set('Authorization', `Bearer ${token}`)
				.query({ field: 'name', value: 'Updated Test Food' });
			expect(response2.body.items[0]).toEqual({
				_id: foodId.body._id,
				name: 'Updated Test Food',
				price: 15,
				materials: [{ id: expect.any(String), _id: materialId, quantity: 3 }],
				subCategoryId: [catId],
				categoryId: catId,
				image: 'updated_image_url',
				isEnabled: true,
				englishName: 'Updated Test Food English',
			});
		});
		it('should return 400 for invalid food id', async () => {
			const updatedFood = {
				name: 'Updated Test Food',
				price: 15,
				materials: [{ _id: materialId, quantity: 3 }],
				subCategoryId: [catId],
				categoryId: catId,
				image: 'updated_image_url',
				isEnabled: true,
				englishName: 'Updated Test Food English',
			};

			const response = await request(baseUrl)
				.put('/food/invalidId')
				.set('Authorization', `Bearer ${token}`)
				.send(updatedFood);

			expect(response.status).toBe(400);
		});

		it('should return 400 for duplicate food name', async () => {
			const updatedFood = {
				name: 'Updated Test Food',
				price: 15,
				materials: [{ _id: materialId, quantity: 3 }],
				subCategoryId: [catId],
				categoryId: catId,
				image: 'updated_image_url',
				isEnabled: true,
				englishName: 'Updated Test Food English',
			};
			const response = await request(baseUrl)
				.put(`/food/${foodId}`)
				.set('Authorization', `Bearer ${token}`)
				.send(updatedFood);

			expect(response.status).toBe(400);
			expect(response.body.message).toBe('Food name already taken!');
		});

		it('should return 400 for invalid categoryId', async () => {
			const updatedFood = {
				name: 'Updated Test Food30',
				price: 15,
				materials: [{ _id: materialId, quantity: 3 }],
				subCategoryId: [catId],
				categoryId: 'invalidCategoryId',
				image: 'updated_image_url',
				isEnabled: true,
				englishName: 'Updated Test Food English',
			};

			const response = await request(baseUrl)
				.put(`/food/${foodId}`)
				.set('Authorization', `Bearer ${token}`)
				.send(updatedFood);

			expect(response.status).toBe(400);
			expect(response.body.message).toBe('The provided ID is invalid!');
		});

		it('should return 400 for invalid subCategoryId', async () => {
			const updatedFood = {
				name: 'Updated Test Food200',
				price: 15,
				materials: [{ _id: materialId, quantity: 3 }],
				subCategoryId: ['invalidSubCategoryId'],
				categoryId: catId,
				image: 'updated_image_url',
				isEnabled: true,
				englishName: 'Updated Test Food English',
			};

			const response = await request(baseUrl)
				.put(`/food/${foodId}`)
				.set('Authorization', `Bearer ${token}`)
				.send(updatedFood);

			expect(response.status).toBe(400);
			expect(response.body.message).toBe('The provided ID is invalid!');
		});
	});

	describe('07 DELETE /food/:id', () => {
		it('should delete a food item by id', async () => {
			const response = await request(baseUrl)
				.delete(`/food/${foodId}`)
				.set('Authorization', `Bearer ${token}`);

			expect(response.status).toBe(200);
			expect(response.body).toEqual({
				_id: foodId,
				name: 'Test Food3',
				price: 10,
				materials: [{ id: expect.any(String), _id: materialId, quantity: 2 }],
				subCategoryId: [catId],
				categoryId: catId,
				image: 'image_url',
				isEnabled: true,
				englishName: 'Test Food English',
			});

			const response2 = await request(baseUrl)
				.get(`/food`)
				.set('Authorization', `Bearer ${token}`)
				.query({ name: 'Test Food3' });

			expect(response2.body.message).toBe(
				'No result in the database for the search condition!'
			);
		});

		it('should return 400 for invalid food id', async () => {
			const response = await request(baseUrl)
				.delete('/food/invalidId')
				.set('Authorization', `Bearer ${token}`);

			expect(response.status).toBe(400);
		});
	});
});
