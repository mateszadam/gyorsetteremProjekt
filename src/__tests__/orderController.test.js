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
		const response = await request(baseUrl).post('/user/login').send({
			name: 'adminUser',
			password: 'adminUser!1',
		});
		await request(baseUrl).post('/drop');
		token = response.body.token;
		await request(baseUrl)
			.post('/material')
			.set('Authorization', `Bearer ${token}`)
			.send({
				name: 'liszt',
				englishName: 'flour',
				unit: 'kg',
			});

		await request(baseUrl)
			.post('/inventory')
			.set('Authorization', `Bearer ${token}`)
			.send({
				name: 'liszt',
				quantity: 100,
				message: 'Initial stock',
			});

		const materials = await request(baseUrl)
			.get('/inventory')
			.set('Authorization', `Bearer ${token}`)
			.send();
		const materialId = materials.body.items[0]._id;

		await request(baseUrl)
			.post('/category')
			.set('Authorization', `Bearer ${token}`)
			.send({
				name: 'string',
				icon: 'no-image.svg',
				englishName: 'string',
			});
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
		costumerId = user.body[0]._id;

		const order = await request(baseUrl)
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
	});

	describe('01 POST /order', () => {
		it('should create a new order', async () => {
			const response = await request(baseUrl)
				.post('/order')
				.set('Authorization', `Bearer ${token}`)
				.send({
					costumerId: costumerId,
					orderedProducts: [{ _id: foodId, quantity: 1 }],
				});

			expect(response.status).toBe(201);
		});
	});

	describe('02 GET /order/salesman', () => {
		it('should get all ongoing orders', async () => {
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
						finishedCokingTime: null,
						finishedTime: null,
					}),
				])
			);
		});
	});

	describe('03 PATCH /order/finish/:id', () => {
		it('should finish an order by id', async () => {
			const response = await request(baseUrl)
				.patch(`/order/finish/${orderId}`)
				.set('Authorization', `Bearer ${token}`)
				.send();
			expect(response.status).toBe(200);
		});
	});

	describe('04 PATCH /order/handover/:id', () => {
		it('should handover an order by id', async () => {
			const response = await request(baseUrl)
				.patch(`/order/handover/${orderId}`)
				.set('Authorization', `Bearer ${token}`)
				.send();
			expect(response.status).toBe(200);
		});
	});

	describe('06 GET /order/kitchen', () => {
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

	describe('08 GET /order/:number', () => {
		beforeAll(async () => {
			for (let i = 0; i < 9; i++) {
				await request(baseUrl)
					.post('/order')
					.set('Authorization', `Bearer ${token}`)
					.send({
						costumerId: costumerId,
						orderedProducts: [{ _id: foodId, quantity: 1 }],
					});
			}
		}, 15000);
		it('should get orders by page number', async () => {
			const pageNumber = 1;
			const pageResponse = await request(baseUrl)
				.get(`/order`)

				.set('Authorization', `Bearer ${token}`)
				.query({ page: pageNumber });
			expect(pageResponse.status).toBe(200);
			expect(pageResponse.body.pageCount).toEqual(2);
			expect(pageResponse.body.items.length).toBeLessThanOrEqual(10);
		});
	});

	describe('09 PATCH /order/revert/finish/:id', () => {
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

	describe('10 PATCH /order/revert/handover/:id', () => {
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
				.set('Authorization', `Bearer ${token}`);
			expect(orderResponse.status).toBe(200);
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

	describe('11 GET /order/display', () => {
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
