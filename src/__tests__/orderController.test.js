const request = require('supertest');
require('dotenv').config();

const baseUrl = process.env.BASE_URL;
let token = '';

describe('orderController Integration Tests', () => {
	describe('01 POST /order/new', () => {
		it('should create a new order', async () => {
			const response = await request(baseUrl)
				.post('/order/new')
				.set('Authorization', `Bearer ${token}`)
				.send({
					costumerId: 'someCustomerId',
					orderedProducts: [{ name: 'TestFood', quantity: 1 }],
				});
			expect(response).toBe(201);
		});
	});

	describe('02 GET /order/ongoing', () => {
		it('should get all ongoing orders', async () => {
			const response = await request(baseUrl)
				.get('/order/ongoing')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
		});
	});

	describe('03 PATCH /order/finish/:id', () => {
		it('should finish an order by id', async () => {
			const orders = await request(baseUrl)
				.get('/order/ongoing')
				.set('Authorization', `Bearer ${token}`);
			const orderId = orders.body[0]._id;

			const response = await request(baseUrl)
				.patch(`/order/finish/${orderId}`)
				.set('Authorization', `Bearer ${token}`);
			expect(response).toBe(200);
		});
	});
});
