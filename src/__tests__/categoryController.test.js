const request = require('supertest');
require('dotenv').config();

const baseUrl = process.env.BASE_URL;
let token = '';

describe('categoryController Integration Tests', () => {
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
	});

	describe('03 PUT /category/:name', () => {
		if (
			('should update category by name',
			async () => {
				const response = await request(baseUrl)
					.put('/category/TestCategory')
					.set('Authorization', `Bearer ${token}`)
					.send({
						name: 'TestCategory',
						icon: 'test-icon3.svg',
					});
				expect(response.status).toBe(200);
				expect(
					await request(baseUrl)
						.get('/category/all')
						.set('Authorization', `Bearer ${token}`)
				).toEqual([
					{
						name: 'TestCategory',
						icon: 'test-icon3.svg',
					},
				]);
			})
		);
	});

	describe('04 DELETE /category/:name', () => {
		it('should category by name', async () => {
			const response = await request(baseUrl)
				.get('/category/TestCategory')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
			expect(
				await request(baseUrl)
					.get('/category/all')
					.set('Authorization', `Bearer ${token}`)
			).toEqual(
				expect.not.arrayContaining([
					expect.objectContaining({ name: 'TestCategory' }),
				])
			);
		});
	});
});
