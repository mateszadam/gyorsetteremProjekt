const { error } = require('console');
const request = require('supertest');
require('dotenv').config();

const baseUrl = process.env.BASE_URL;
let token = '';
let catId = '';
let costumerId = '';
let orderId = '';

describe('orderController Integration Tests', () => {
	beforeAll(async () => {
		const response = await request(baseUrl)
			.post('/user/login')
			.send({ name: 'adminUser', password: 'adminUser!1' });
		await request(baseUrl).post('/drop');
		token = response.body.token;
		await request(baseUrl)
			.post('/material')
			.set('Authorization', `Bearer ${token}`)
			.send({ name: 'liszt', englishName: 'flour', unit: 'kg' });

		await request(baseUrl)
			.post('/inventory')
			.set('Authorization', `Bearer ${token}`)
			.send({ name: 'liszt', quantity: 100, message: 'Initial stock' });

		const materials = await request(baseUrl)
			.get('/inventory')
			.set('Authorization', `Bearer ${token}`)
			.send();
		const materialId = materials.body.items[0]._id;

		await request(baseUrl)
			.post('/category')
			.set('Authorization', `Bearer ${token}`)
			.send({ name: 'string', icon: 'no-image.svg', englishName: 'string' });
		const category = await request(baseUrl)
			.get('/category')
			.set('Authorization', `Bearer ${token}`)
			.send();
		catId = category.body.items[0]._id;
		await request(baseUrl)
			.post('/food')
			.set('Authorization', `Bearer ${token}`)
			.send({
				name: 'TestFood3',
				price: 10,
				materials: [{ _id: materialId, quantity: 1 }],
				categoryId: catId,
				subCategoryId: [catId],
				image: 'no-image',
				englishName: 'Test Food English',
			});

		const user = await request(baseUrl)
			.get('/user/all')
			.set('Authorization', `Bearer ${token}`);

		const foods = await request(baseUrl)
			.get('/food')
			.set('Authorization', `Bearer ${token}`);

		foodId = foods.body.items[0]._id;
		costumerId = user.body.items[0]._id;

		await request(baseUrl)
			.post('/order')
			.set('Authorization', `Bearer ${token}`)
			.send({
				costumerId: costumerId,
				orderedProducts: [{ _id: foodId, quantity: 1 }],
			});

		const orderResponse = await request(baseUrl)
			.get(`/order`)
			.set('Authorization', `Bearer ${token}`);
		orderId = orderResponse.body.items[0]._id;
		for (let i = 0; i < 9; i++) {
			await request(baseUrl)
				.post('/order')
				.set('Authorization', `Bearer ${token}`)
				.send({
					costumerId: costumerId,
					orderedProducts: [{ _id: foodId, quantity: 1 }],
				});
		}
	}, 600000);

	describe('01 POST /order', () => {
		it('should create a new order', async () => {
			const response = await request(baseUrl)
				.post('/order')
				.set('Authorization', `Bearer ${token}`)
				.send({
					costumerId: costumerId,
					orderedProducts: [{ _id: foodId, quantity: 5 }],
				});
			expect(response.status).toBe(201);
			expect(response.body).toEqual(
				expect.objectContaining({
					_id: expect.any(String),
					costumerId: expect.any(String),
					orderedProducts: expect.any(Array),
					orderedTime: expect.any(String),
					orderNumber: expect.any(Number),
					totalPrice: expect.any(Number),
					finishedCokingTime: null,
					finishedTime: null,
				})
			);

			const materialChanges = await request(baseUrl)
				.get('/inventory')
				.set('Authorization', `Bearer ${token}`);
			expect(materialChanges.body.items[0].inStock).toBe(85);
		});

		it('should return 400 if costumerId is invalid', async () => {
			const response = await request(baseUrl)
				.post('/order')
				.set('Authorization', `Bearer ${token}`)
				.send({
					costumerId: 'invalidId',
					orderedProducts: [{ _id: foodId, quantity: 1 }],
				});
			expect(response.status).toBe(400);
			expect(response.body.message).toBe('The provided ID is invalid!');
		});

		it('should return 400 if orderedProducts are invalid', async () => {
			const response = await request(baseUrl)
				.post('/order')
				.set('Authorization', `Bearer ${token}`)
				.send({
					costumerId: costumerId,
					orderedProducts: [{ _id: '67bf345ee82353e877b1f657', quantity: 1 }],
				});
			expect(response.status).toBe(400);
			expect(response.body.message).toBe('Product ID not found.');
		});

		it('should return 400 if there is not enough material', async () => {
			const order = await request(baseUrl)
				.post('/order')
				.set('Authorization', `Bearer ${token}`)
				.send({
					costumerId: costumerId,
					orderedProducts: [{ _id: foodId, quantity: 1000 }],
				});
			expect(order.status).toBe(400);
			expect(order.body.message).toBe(
				'The provided quantity would result in a negative ingredient quantity!'
			);

			const materialChanges = await request(baseUrl)
				.get('/inventory')
				.set('Authorization', `Bearer ${token}`);
			expect(materialChanges.body.items[0].inStock).toBe(85);

			expect(
				(
					await request(baseUrl)
						.get('/order')
						.set('Authorization', `Bearer ${token}`)
						.query({ field: '_id', value: order.body._id })
				).body.items.length
			).toBe(10);
		});
	});

	describe('02 GET /order/salesman', () => {
		it('should not get any ongoing orders (because there ar no)', async () => {
			const response = await request(baseUrl)
				.get('/order/salesman')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
			expect(response.body).toEqual([]);
		});

		it('should get all ongoing orders', async () => {
			await request(baseUrl)
				.patch(`/order/finish/${orderId}`)
				.set('Authorization', `Bearer ${token}`);

			const response = await request(baseUrl)
				.get('/order/salesman')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);

			expect(response.body).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						_id: expect.any(String),
						costumerId: expect.any(String),
						orderedProducts: expect.any(Array),
						orderedTime: expect.any(String),
						orderNumber: expect.any(Number),
						totalPrice: expect.any(Number),
						finishedCokingTime: expect.any(String),
						finishedTime: null,
					}),
				])
			);
		});
	});
	describe('03 GET /order/kitchen', () => {
		it('should get all orders for the kitchen', async () => {
			const response = await request(baseUrl)
				.get('/order/kitchen')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
			expect(response.body.length).toBeGreaterThan(0);
			response.body.forEach((order) => {
				expect(order.finishedCokingTime).toBeNull();
			});
		});
	});

	describe('04 PATCH /order/finish/:id', () => {
		it('should finish an order by id', async () => {
			const response = await request(baseUrl)
				.patch(`/order/finish/${orderId}`)
				.set('Authorization', `Bearer ${token}`)
				.send();
			expect(response.status).toBe(200);
			expect(
				(
					await request(baseUrl)
						.get(`/order/${orderId}`)
						.set('Authorization', `Bearer ${token}`)
				).body.finishedCokingTime
			).not.toBeNull();
		});

		it('should return 400 if order id is invalid', async () => {
			const response = await request(baseUrl)
				.patch('/order/finish/67bf345ee82353e877b1f657')
				.set('Authorization', `Bearer ${token}`)
				.send();
			expect(response.status).toBe(400);
			expect(response.body.message).toBe('Order ID not found in the database!');
		});
	});

	describe('05 PATCH /order/handover/:id', () => {
		it('should handover an order by id', async () => {
			const response = await request(baseUrl)
				.patch(`/order/handover/${orderId}`)
				.set('Authorization', `Bearer ${token}`)
				.send();
			expect(response.status).toBe(200);
			expect(
				(
					await request(baseUrl)
						.get(`/order/${orderId}`)
						.set('Authorization', `Bearer ${token}`)
				).body.finishedTime
			).not.toBeNull();
		});
		it('should return 400 if order id is invalid', async () => {
			const response = await request(baseUrl)
				.patch('/order/handover/67bf345ee82353e877b1f657')
				.set('Authorization', `Bearer ${token}`)
				.send();
			expect(response.status).toBe(400);
			expect(response.body.message).toBe('Order ID not found in the database!');
		});
	});

	describe('06 PATCH /order/revert/finish/:id', () => {
		it('should revert the kitchen finish time of an order by id', async () => {
			await request(baseUrl)
				.patch(`/order/finish/${orderId}`)
				.set('Authorization', `Bearer ${token}`)
				.send();

			const response = await request(baseUrl)
				.patch(`/order/revert/finish/${orderId}`)
				.set('Authorization', `Bearer ${token}`)
				.send();

			expect(response.status).toBe(200);

			const orderResponse = await request(baseUrl)
				.get(`/order`)
				.set('Authorization', `Bearer ${token}`)
				.query({ field: '_id', value: orderId });
			expect(orderResponse.body.items[0].finishedCokingTime).toBeNull();
		});

		it('should return 400 if order id is invalid', async () => {
			const response = await request(baseUrl)
				.patch('/order/revert/finish/invalidOrderId')
				.set('Authorization', `Bearer ${token}`)
				.send();
			expect(response.status).toBe(400);
			expect(response.body.message).toBe('The provided ID is invalid!');
		});
	});

	describe('07 PATCH /order/revert/handover/:id', () => {
		it('should revert the received order by id', async () => {
			await request(baseUrl)
				.patch(`/order/handover/${orderId}`)
				.set('Authorization', `Bearer ${token}`)
				.send();

			const response = await request(baseUrl)
				.patch(`/order/revert/handover/${orderId}`)
				.set('Authorization', `Bearer ${token}`)
				.send();

			expect(response.status).toBe(200);

			const orderResponse = await request(baseUrl)
				.get(`/order`)
				.set('Authorization', `Bearer ${token}`)
				.query({ field: '_id', value: orderId });
			expect(orderResponse.body.items[0].finishedTime).toBeNull();
		});

		it('should return 400 if order id is invalid', async () => {
			const response = await request(baseUrl)
				.patch('/order/revert/handover/invalidOrderId')
				.set('Authorization', `Bearer ${token}`)
				.send();
			expect(response.status).toBe(400);
			expect(response.body.message).toBe('The provided ID is invalid!');
		});
	});

	describe('08 GET /order/display', () => {
		it('should get orders for display', async () => {
			const response = await request(baseUrl)
				.get('/order/display')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
			response.body.forEach((order) => {
				expect(order).toHaveProperty('finishedCokingTime');
				expect(order).toHaveProperty('orderNumber');
			});
		});
	});
});
