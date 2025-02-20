const e = require('cors');
const request = require('supertest');
const { ExitStatus } = require('typescript');
require('dotenv').config();

const baseUrl = process.env.BASE_URL;
let token = '';
let catId = '';
let costumerId = '';
describe('orderController Integration Tests', () => {
	beforeAll(async () => {
		const response = await request(baseUrl).post('/user/login').send({
			name: 'adminUser',
			password: 'adminUser!1',
		});
		token = response.body.token;
	});
	beforeAll(async () => {
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
	});
	describe('01 POST /order/new', () => {
		it('should create a new order', async () => {
			await request(baseUrl).post('/user/register/customer').send({
				name: 'TestCustomer',
				password: 'Test@1234',
				email: 'testcustomer@example.com',
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
					name: 'TestFood',
					price: 10,
					materials: [{ name: 'liszt', quantity: 1 }],
					categoryId: [catId],
					image: 'no-image',
				});
			const user = await request(baseUrl)
				.get('/user/all')
				.set('Authorization', `Bearer ${token}`);

			costumerId = user.body[0]._id;
			const response = await request(baseUrl)
				.post('/order/new')
				.set('Authorization', `Bearer ${token}`)
				.send({
					costumerId: costumerId,
					orderedProducts: [{ name: 'TestFood', quantity: 1 }],
				});
			orderId = response.body.message;
			expect(response.status).toBe(201);

			expect(
				(
					await request(baseUrl)
						.get('/order/ongoing')
						.set('Authorization', `Bearer ${token}`)
				).body
			).toEqual([
				{
					_id: expect.any(String),
					costumerId: costumerId,
					orderedProducts: [{ name: 'testfood', quantity: 1, id: null }],
					orderedTime: expect.any(String),
				},
			]);
		});
	});

	describe('02 GET /order/ongoing', () => {
		it('should get all ongoing orders', async () => {
			const user = await request(baseUrl)
				.get('/user/all')
				.set('Authorization', `Bearer ${token}`);

			costumerId = user.body[0]._id;
			const response = await request(baseUrl)
				.get('/order/ongoing')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);

			expect(response.body).toEqual([
				{
					_id: expect.any(String),
					costumerId: expect.any(String),
					orderedProducts: expect.any(Array),
					orderedTime: expect.any(String),
				},
			]);
		});
	});
	describe('03 GET /finished/:id', () => {
		it('should finish an order by id', async () => {
			const orders = await request(baseUrl)
				.patch(`/order/finish/${orderId}`)
				.set('Authorization', `Bearer ${token}`)
				.send();
			expect(orders.status).toBe(200);
		});
	});

	describe('04 GET /handover/:id', () => {
		it('should handover an order by id', async () => {
			const orders = await request(baseUrl)
				.patch(`/order/handover/${orderId}`)
				.set('Authorization', `Bearer ${token}`)
				.send();
			expect(orders.status).toBe(200);
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

	describe('07 GET /order/:id', () => {
		it('should get an order by id', async () => {
			const response = await request(baseUrl)
				.get(`/order/${orderId}`)
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
			expect(response.body.length).toBeGreaterThan(0);
		});

		it('should return 404 if order is not found', async () => {
			const response = await request(baseUrl)
				.get('/order/invalidOrderId')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(400);
			expect(response.body.message).toBe('The provided ID is invalid!');
		});
	});

	describe('08 GET /order/page/:number', () => {
		it('should get orders by page number', async () => {
			const pageNumber = 1;
			const response = await request(baseUrl)
				.get(`/order/page/${pageNumber}`)
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
			expect(response.body.length).toBeLessThanOrEqual(10);
		});
	});

	describe('9 PATCH /order/finish/:id', () => {
		it('should finish an order by id', async () => {
			const orders = await request(baseUrl)
				.get('/order/ongoing')
				.set('Authorization', `Bearer ${token}`)
				.send();
			expect(orders.status).toBe(200);
			const orderId = orders.body[0]._id;

			const response = await request(baseUrl)
				.patch(`/order/finish/${orderId}`)
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
		});
	});
});
