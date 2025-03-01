const request = require('supertest');
require('dotenv').config();

const baseUrl = process.env.BASE_URL;
let token = '';
let catId = '';
let costumerId = '';
let orderId = '';

describe('statisticController Integration Tests', () => {
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
	}, 30000);

	describe('01 POST /dashboard/registeredUsers', () => {
		it('should return the number of registered users within a date range', async () => {
			const response = await request(baseUrl)
				.post('/dashboard/registeredUsers')
				.set('Authorization', `Bearer ${token}`)
				.query({ startDate: '2023-01-01', endDate: '2023-12-31' });

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty('filteredUsers');
			expect(response.body).toHaveProperty('totalUsers');
		});
	});

	describe('02 POST /dashboard/revenue', () => {
		it('should return the revenue within a date range', async () => {
			const response = await request(baseUrl)
				.post('/dashboard/revenue')
				.set('Authorization', `Bearer ${token}`)
				.query({ startDate: '2023-01-01', endDate: '2023-12-31' });

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty('revenue');
		});
	});

	describe('03 POST /dashboard/soldProducts', () => {
		it('should return the number of sold products within a date range', async () => {
			const response = await request(baseUrl)
				.post('/dashboard/soldProducts')
				.set('Authorization', `Bearer ${token}`)
				.query({ startDate: '2023-01-01', endDate: '2023-12-31' });

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty('soldProducts');
		});
	});

	describe('04 POST /dashboard/orderCount', () => {
		it('should return the number of orders within a date range', async () => {
			const response = await request(baseUrl)
				.post('/dashboard/orderCount')
				.set('Authorization', `Bearer ${token}`)
				.query({ startDate: '2023-01-01', endDate: '2023-12-31' });

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty('orderCount');
		});
	});

	describe('05 POST /dashboard/categorizedOrders', () => {
		it('should return categorized orders within a date range', async () => {
			const response = await request(baseUrl)
				.post('/dashboard/categorizedOrders')
				.set('Authorization', `Bearer ${token}`)
				.query({ startDate: '2023-01-01', endDate: '2023-12-31' })
				.send({ category: [1000, 2000, 3000] });

			expect(response.status).toBe(200);
			expect(response.body).toBeInstanceOf(Object);
		});
	});

	describe('06 POST /dashboard/orderTimes', () => {
		it('should return average cooking and handover times within a date range', async () => {
			const response = await request(baseUrl)
				.post('/dashboard/orderTimes')
				.set('Authorization', `Bearer ${token}`)
				.query({ startDate: '2023-01-01', endDate: '2023-12-31' });

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty('avgCookingTime');
			expect(response.body).toHaveProperty('avgHandoverTime');
		});
	});

	describe('07 POST /dashboard/totalOrders', () => {
		it('should return the total number of orders', async () => {
			const response = await request(baseUrl)
				.post('/dashboard/totalOrders')
				.set('Authorization', `Bearer ${token}`);

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty('totalOrders');
		});
	});
});
