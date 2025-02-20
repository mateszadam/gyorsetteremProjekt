const request = require('supertest');
require('dotenv').config();

const baseUrl = process.env.BASE_URL;
let token = '';

describe('orderController Integration Tests', () => {
	describe('01 POST /order/new', () => {
		it('should create a new order', async () => {
			await request(baseUrl).post('/user/register/customer').send({
				name: 'TestCustomer',
				password: 'Test@1234',
				email: 'testcustomer@example.com',
			});
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

			const response = await request(baseUrl)
				.post('/order/new')
				.set('Authorization', `Bearer ${token}`)
				.send({
					costumerId: user.body[0]._id,
					orderedProducts: [{ name: 'TestFood', quantity: 1 }],
				});
			expect(response.status).toBe(201);
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
