const request = require('supertest');
require('dotenv').config();

const baseUrl = process.env.BASE_URL;
let token = '';

describe('categoryController Integration Tests', () => {
	beforeAll(async () => {
		await request(baseUrl).post('/drop');

		const response = await request(baseUrl).post('/user/login').send({
			name: 'adminUser',
			password: 'adminUser!1',
		});
		token = response.body.token;
	});
	describe('01 POST /category/add', () => {
		it('should add a new category', async () => {
			const response = await request(baseUrl)
				.post('/category/add')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'TestCategory',
					icon: 'test-icon.svg',
				});
			expect(response.status).toBe(200);
		});
		it('should not add a new category without name', async () => {
			const response = await request(baseUrl)
				.post('/category/add')
				.set('Authorization', `Bearer ${token}`)
				.send({
					icon: 'test-icon.svg',
				});
			expect(response.status).toBe(400);
			expect(response.body.message).toBe('Name is required');
		});
		it('should not add a new category when category already exists ', async () => {
			const response = await request(baseUrl)
				.post('/category/add')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'TestCategory',
					icon: 'test-icon.svg',
				});

			expect(response.status).toBe(400);
			expect(response.body.message).toBe('Category name is already taken!');
		});
	});

	describe('02 GET /category/all', () => {
		it('should get all categories', async () => {
			const response = await request(baseUrl)
				.get('/category/all')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
			response.body.forEach((item) => {
				expect(item).toEqual({
					_id: expect.any(String),
					name: expect.any(String),
					icon: expect.any(String),
				});
			});
		});
		it('should not get without token', async () => {
			const response = await request(baseUrl).get('/category/all');
			expect(response.status).toBe(401);
		});
	});

	describe('03 PUT /category/:id', () => {
		it('should update category by id', async () => {
			const categories = await request(baseUrl)
				.get('/category/all')
				.set('Authorization', `Bearer ${token}`);

			const response = await request(baseUrl)
				.put(`/category/${categories.body[0]._id}`)
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'TestCategory2',
					icon: 'test-icon3.svg',
				});
			expect(response.status).toBe(200);
			expect(
				(
					await request(baseUrl)
						.get('/category/all')
						.set('Authorization', `Bearer ${token}`)
				).body
			).toEqual(
				expect.arrayContaining([
					{
						_id: expect.any(String),
						name: 'TestCategory2',
						icon: 'test-icon3.svg',
					},
				])
			);
		});
		it('should not update category without id', async () => {
			const response = await request(baseUrl)
				.put('/category/TestCategory2')
				.set('Authorization', `Bearer ${token}`)
				.send({
					icon: 'test-icon3.svg',
				});
			expect(response.status).toBe(400);
			expect(response.body.message).toBe('Name is required');
		});
		it('should not update category when category already exists ', async () => {
			const response = await request(baseUrl)
				.put('/category/TestCategoryId')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'TestCategory',
					icon: 'test-icon3.svg',
				});
			expect(response.status).toBe(400);
			expect(response.body.message).toBe('The provided ID is invalid!');
		});
	});

	describe('04 DELETE /category/:name', () => {
		it('should category by name', async () => {
			const response = await request(baseUrl)
				.delete('/category/TestCategory2')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
			expect(
				await request(baseUrl)
					.get('/category/all')
					.set('Authorization', `Bearer ${token}`)
			).toEqual(
				expect.not.arrayContaining([
					expect.objectContaining({ name: 'TestCategory2' }),
				])
			);
		});
		it('should not delete category without name', async () => {
			const response = await request(baseUrl)
				.delete('/category/dasd')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(400);
		});
	});
	describe('05 GET /category/filter', () => {
		it('should filter categories by field and value', async () => {
			await request(baseUrl)
				.post('/category/add')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'TestCategory2',
					icon: 'test-icon3.svg',
				});

			const response = await request(baseUrl)
				.get('/category/filter')
				.set('Authorization', `Bearer ${token}`)
				.query({ field: 'name', value: 'TestCategory2' });

			await request(baseUrl)
				.delete('/category/TestCategory2')
				.set('Authorization', `Bearer ${token}`);

			expect(response.status).toBe(200);
			expect(response.body).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ name: 'TestCategory2' }),
				])
			);
		});

		it('should return error if field is missing', async () => {
			const response = await request(baseUrl)
				.get('/category/filter')
				.set('Authorization', `Bearer ${token}`)
				.query({ value: 'TestCategory' });
			expect(response.status).toBe(400);
			expect(response.body.message).toBe(
				'The search condition is not found in the URL!'
			);
		});

		it('should return error if value is missing', async () => {
			const response = await request(baseUrl)
				.get('/category/filter')
				.set('Authorization', `Bearer ${token}`)
				.query({ field: 'name' });
			expect(response.status).toBe(400);
			expect(response.body.message).toBe(
				'The search condition is not found in the URL!'
			);
		});

		it('should return error if no categories match the filter', async () => {
			const response = await request(baseUrl)
				.get('/category/filter')
				.set('Authorization', `Bearer ${token}`)
				.query({ field: 'name', value: 'NonExistentCategory' });
			expect(response.status).toBe(400);
			expect(response.body.message).toBe(
				'No result in the database for the search condition!'
			);
		});
	});
});
