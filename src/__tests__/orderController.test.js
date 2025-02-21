const e = require('cors');
const { waitForDebugger } = require('inspector');
const { after } = require('node:test');
const { finished } = require('stream');
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
		token = response.body.token;
		await request(baseUrl)
			.post('/material/add')
			.set('Authorization', `Bearer ${token}`)
			.send({
				name: 'liszt',
				quantity: 60,
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
		await request(baseUrl)
			.post('/food/add')
			.set('Authorization', `Bearer ${token}`)
			.send({
				name: 'TestFood3',
				price: 10,
				materials: [{ name: 'liszt', quantity: 1 }],
				categoryId: catId,
				subCategoryId: [catId],
				image: 'no-image',
			});

		const user = await request(baseUrl)
			.get('/user/all')
			.set('Authorization', `Bearer ${token}`);

		const foods = await request(baseUrl)
			.get('/food/all')
			.set('Authorization', `Bearer ${token}`);
		expect(foods.status).toBe(200);

		foodId = foods.body[0].name;
		costumerId = user.body[0]._id;

		const order = await request(baseUrl)
			.post('/order/new')
			.set('Authorization', `Bearer ${token}`)
			.send({
				costumerId: costumerId,
				orderedProducts: [{ name: 'TestFood3', quantity: 1 }],
			});
		orderId = order.body.orderId;
	});

	describe('01 POST /order/new', () => {
		it('should create a new order', async () => {
			const response = await request(baseUrl)
				.post('/order/new')
				.set('Authorization', `Bearer ${token}`)
				.send({
					costumerId: costumerId,
					orderedProducts: [{ name: 'TestFood3', quantity: 1 }],
				});

			expect(response.status).toBe(201);
			expect(
				(
					await request(baseUrl)
						.get('/order/ongoing')
						.set('Authorization', `Bearer ${token}`)
				).body
			).toEqual(
				expect.arrayContaining([
					{
						_id: response.body.orderId,
						costumerId: costumerId,
						orderedProducts: [{ name: 'testfood3', quantity: 1, id: null }],
						orderedTime: expect.any(String),
						orderNumber: expect.any(Number),
						totalPrice: expect.any(Number),
					},
				])
			);
		});
	});

	describe('02 GET /order/ongoing', () => {
		it('should get all ongoing orders', async () => {
			const response = await request(baseUrl)
				.get('/order/ongoing')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);

			expect(response.body).toEqual(
				expect.arrayContaining([
					{
						_id: expect.any(String),
						costumerId: expect.any(String),
						orderedProducts: expect.any(Array),
						orderedTime: expect.any(String),
						orderNumber: expect.any(Number),
						totalPrice: expect.any(Number),
					},
				])
			);
		});
	});
	describe('03 PATCH /finished/:id', () => {
		it('should finish an order by id', async () => {
			const orders = await request(baseUrl)
				.patch(`/order/finish/${orderId}`)
				.set('Authorization', `Bearer ${token}`)
				.send();
			expect(orders.status).toBe(200);
			expect(
				(
					await request(baseUrl)
						.get(`/order/all/${costumerId}`)
						.set('Authorization', `Bearer ${token}`)
				).body
			).toEqual(
				expect.arrayContaining([
					{
						_id: expect.any(String),
						costumerId: costumerId,
						orderedProducts: [{ name: 'testfood3', quantity: 1, id: null }],
						orderedTime: expect.any(String),
						orderNumber: expect.any(Number),
						finishedCokingTime: expect.any(String),
						totalPrice: expect.any(Number),
					},
				])
			);
		});
	});

	describe('04 PATCH /handover/:id', () => {
		it('should handover an order by id', async () => {
			const orders = await request(baseUrl)
				.patch(`/order/handover/${orderId}`)
				.set('Authorization', `Bearer ${token}`)
				.send();
			expect(orders.status).toBe(200);
			expect(
				(
					await request(baseUrl)
						.get(`/order/all/${costumerId}`)
						.set('Authorization', `Bearer ${token}`)
				).body
			).toEqual(
				expect.arrayContaining([
					{
						_id: expect.any(String),
						costumerId: costumerId,
						orderedProducts: [{ name: 'testfood3', quantity: 1, id: null }],
						orderedTime: expect.any(String),
						orderNumber: expect.any(Number),
						finishedCokingTime: expect.any(String),
						finishedTime: expect.any(String),
						totalPrice: expect.any(Number),
					},
				])
			);
		});
	});
	// TODO: Enable this test after implementing the feature
	// describe('05 GET /order/all/:from/:to', () => {
	// 	it('should get all orders within the specified date range', async () => {
	// 		const fromDate = new Date();
	// 		const response = await request(baseUrl)
	// 			.get(`/order/all/${fromDate}/{to}`)
	// 			.set('Authorization', `Bearer ${token}`);
	// 		expect(response).toBe(200);
	// 		response.body.forEach((order) => {
	// 			expect(new Date(order.finishedTime)).toBeGreaterThanOrEqual(
	// 				new Date(fromDate)
	// 			);
	// 		});
	// 	});
	// });
	describe('06 GET /order/kitchen', () => {
		it('should get all orders for the kitchen', async () => {
			await request(baseUrl)
				.post('/order/new')
				.set('Authorization', `Bearer ${token}`)
				.send({
					costumerId: costumerId,
					orderedProducts: [{ name: 'TestFood', quantity: 1 }],
				});
			const response = await request(baseUrl)
				.get('/order/kitchen')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
			expect(response.body.length).toBeGreaterThan(0);
			response.body.forEach((order) => {
				expect(order.finishedCokingTime).toBeUndefined();
			});
		});
	});

	describe('07 GET /order/all/:id', () => {
		it('should get an order by user id', async () => {
			const response = await request(baseUrl)
				.get(`/order/all/${costumerId}`)
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
			expect(response.body.length).toBeGreaterThan(0);
		});

		it('should return 404 if order is not found', async () => {
			const response = await request(baseUrl)
				.get('/order/all/invalidOrderId')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(400);
			expect(response.body.message).toBe('The provided ID is invalid!');
		});
	});

	describe('08 GET /order/page/:number', () => {
		beforeAll(async () => {
			for (let i = 0; i < 9; i++) {
				await request(baseUrl)
					.post('/order/new')
					.set('Authorization', `Bearer ${token}`)
					.send({
						costumerId: costumerId,
						orderedProducts: [{ name: 'TestFood3', quantity: 1 }],
					});
			}
		}, 15000);
		it('should get orders by page number', async () => {
			const pageNumber = 1;
			const pageResponse = await request(baseUrl)
				.get(`/order/page/${pageNumber}`)
				.set('Authorization', `Bearer ${token}`);
			expect(pageResponse.status).toBe(200);
			expect(pageResponse.body.pageCount).toEqual(1);
			expect(pageResponse.body.orders.length).toBeLessThanOrEqual(10);
		});
	});
	describe('9 PATCH /order/finish/:id', () => {
		it('should finish an order by id', async () => {
			const response = await request(baseUrl)
				.patch(`/order/finish/${orderId}`)
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
		});
	});
});
