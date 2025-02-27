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
		});

		it('should get all enabled food items', async () => {
			const response = await request(baseUrl)
				.get('/food/allEnabled')
				.set('Authorization', `Bearer ${token}`);

			expect(response.status).toBe(200);
			expect(response.body).toBeInstanceOf(Array);
		});
	});
	describe('02 GET /food/allToOrder', () => {
		it('should get food items to order', async () => {
			const response = await request(baseUrl)
				.get('/food/allToOrder')
				.set('Authorization', `Bearer ${token}`);

			expect(response.status).toBe(200);
			expect(response.body).toBeInstanceOf(Array);
		});
	});

	describe('03 GET /food', () => {
		it('should filter food items', async () => {
			const response = await request(baseUrl)
				.get('/food')
				.set('Authorization', `Bearer ${token}`)
				.query({ field: 'name', value: 'Test Food', page: 1 });

			expect(response.status).toBe(200);
			expect(response.body.items).toBeInstanceOf(Array);
		});

		it('should return 400 for invalid filter field', async () => {
			const response = await request(baseUrl)
				.get('/food')
				.set('Authorization', `Bearer ${token}`)
				.query({ field: 'invalidField', value: 'Test Food', page: 1 });

			expect(response.status).toBe(400);
		});
	});

	describe('04 PATCH /food/disable/:id', () => {
		it('should disable a food item by id', async () => {
			const response = await request(baseUrl)
				.patch(`/food/disable/${foodId}`)
				.set('Authorization', `Bearer ${token}`);

			expect(response.status).toBe(200);
		});

		it('should return 400 for invalid food id', async () => {
			const response = await request(baseUrl)
				.patch('/food/disable/invalidId')
				.set('Authorization', `Bearer ${token}`);

			expect(response.status).toBe(400);
		});
	});

	describe('05 PATCH /food/enable/:id', () => {
		it('should enable a food item by id', async () => {
			const response = await request(baseUrl)
				.patch(`/food/enable/${foodId}`)
				.set('Authorization', `Bearer ${token}`);

			expect(response.status).toBe(200);
		});

		it('should return 400 for invalid food id', async () => {
			const response = await request(baseUrl)
				.patch('/food/enable/invalidId')
				.set('Authorization', `Bearer ${token}`);

			expect(response.status).toBe(400);
		});
	});

	describe('06 PUT /food/:id', () => {
		// it('should update a food item by id', async () => {
		// 	const updatedFood = {
		// 		name: 'Updated Test Food',
		// 		price: 15,
		// 		materials: [{ _id: materialId, quantity: 3 }],
		// 		subCategoryId: [catId],
		// 		categoryId: catId,
		// 		image: 'updated_image_url',
		// 		isEnabled: true,
		// 		englishName: 'Updated Test Food English',
		// 	};

		// 	const response = await request(baseUrl)
		// 		.put(`/food/${foodId}`)
		// 		.set('Authorization', `Bearer ${token}`)
		// 		.send(updatedFood);

		// 	expect(response).toBe(200);
		// });

		it('should return 400 for invalid food id', async () => {
			const updatedFood = {
				name: 'Updated Test Food',
				price: 15,
				materials: [{ _id: 'materialId1', quantity: 3 }],
				subCategoryId: ['subCategoryId1'],
				categoryId: 'categoryId1',
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
	});

	describe('07 DELETE /food/:id', () => {
		it('should delete a food item by id', async () => {
			const response = await request(baseUrl)
				.delete(`/food/${foodId}`)
				.set('Authorization', `Bearer ${token}`);

			expect(response.status).toBe(200);
		});

		it('should return 400 for invalid food id', async () => {
			const response = await request(baseUrl)
				.delete('/food/invalidId')
				.set('Authorization', `Bearer ${token}`);

			expect(response.status).toBe(400);
		});
	});
});
