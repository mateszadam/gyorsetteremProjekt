const request = require('supertest');
require('dotenv').config();

const baseUrl = process.env.BASE_URL;
let token = '';

describe('categoryController Integration Tests', () => {
	beforeAll(async () => {
		await request(baseUrl).post('/drop');

		const response = await request(baseUrl)
			.post('/user/login')
			.send({ name: 'adminUser', password: 'adminUser!1' });
		token = response.body.token;
	});

	describe('01 POST /category', () => {
		it('should add a new category', async () => {
			const response = await request(baseUrl)
				.post('/category')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'TestCategory',
					icon: 'test-icon.svg',
					englishName: 'TestCategory',
				});
			expect(response.status).toBe(200);
			expect(response.body).toEqual(
				expect.objectContaining({
					_id: expect.any(String),
					name: 'TestCategory',
					icon: 'test-icon.svg',
					englishName: 'TestCategory',
				})
			);
		});

		it('should not add a new category without name', async () => {
			const response = await request(baseUrl)
				.post('/category')
				.set('Authorization', `Bearer ${token}`)
				.send({ icon: 'test-icon.svg', englishName: 'TestCategory' });
			expect(response.status).toBe(400);
			expect(response.body.message).toBe('Name is required');
		});
		it('should not add a new category without englishName', async () => {
			const response = await request(baseUrl)
				.post('/category')
				.set('Authorization', `Bearer ${token}`)
				.send({ icon: 'test-icon.svg', name: 'TestCategory' });
			expect(response.status).toBe(400);
			expect(response.body.message).toBe('English name is required');
		});
		it('should not add a new category without icon', async () => {
			const response = await request(baseUrl)
				.post('/category')
				.set('Authorization', `Bearer ${token}`)
				.send({ englishName: 'TestCategoryEnglish', name: 'TestCategory' });
			expect(response.status).toBe(400);
			expect(response.body.message).toBe('Icon is required.');
		});

		it('should not add a new category when category already exists', async () => {
			const response = await request(baseUrl)
				.post('/category')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'TestCategory',
					icon: 'test-icon.svg',
					englishName: 'TestCategory',
				});
			expect(response.status).toBe(400);
			expect(response.body.message).toBe('Category name is already taken!');
		});
	});

	describe('02 PUT /category/:id', () => {
		it('should update category by id', async () => {
			const categories = await request(baseUrl)
				.get('/category')
				.set('Authorization', `Bearer ${token}`);

			const response = await request(baseUrl)
				.put(`/category/${categories.body.items[0]._id}`)
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'TestCategory2',
					icon: 'test-icon3.svg',
					englishName: 'TestCategory2',
				});
			expect(response.status).toBe(200);
			expect(response.body).toEqual(
				expect.objectContaining({
					_id: expect.any(String),
					name: 'TestCategory2',
					icon: 'test-icon3.svg',
					englishName: 'TestCategory2',
				})
			);
			expect(
				(
					await request(baseUrl)
						.get('/category')
						.set('Authorization', `Bearer ${token}`)
				).body.items
			).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						_id: expect.any(String),
						name: 'TestCategory2',
						icon: 'test-icon3.svg',
						englishName: 'TestCategory2',
					}),
				])
			);
		});

		it('should not update category without valid id', async () => {
			const response = await request(baseUrl)
				.put('/category/679f462818947c0fa463a88f')
				.set('Authorization', `Bearer ${token}`)
				.send({ icon: 'test-icon3.svg' });
			expect(response.status).toBe(400);
			expect(response.body.message).toBe('Name is required');
		});

		it('should not update category when id is invalid', async () => {
			const response = await request(baseUrl)
				.put('/category/TestCategoryId')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'TestCategory',
					icon: 'test-icon3.svg',
					englishName: 'TestCategory',
				});
			expect(response.status).toBe(400);
			expect(response.body.message).toBe('The provided ID is invalid!');
		});
		it('should not update category when category name occupied', async () => {
			await request(baseUrl)
				.post('/category')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'TestCategory3',
					icon: 'test-icon3.svg',
					englishName: 'TestCategory3',
				});

			const categories = await request(baseUrl)
				.get('/category')
				.set('Authorization', `Bearer ${token}`);

			const response = await request(baseUrl)
				.put(`/category/${categories.body.items[0]._id}`)
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'TestCategory3',
					icon: 'test-icon3.svg',
					englishName: 'TestCategory',
				});
			expect(response.status).toBe(400);
			expect(response.body.message).toBe('Category name is already taken!');
		});
	});

	describe('04 DELETE /category/:id', () => {
		it('should delete category by id', async () => {
			const categories = await request(baseUrl)
				.get('/category')
				.set('Authorization', `Bearer ${token}`);

			const response = await request(baseUrl)
				.delete(`/category/${categories.body.items[0]._id}`)
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
			expect(
				(
					await request(baseUrl)
						.get('/category')
						.set('Authorization', `Bearer ${token}`)
				).body.items
			).toEqual(
				expect.not.arrayContaining([
					expect.objectContaining({ name: 'TestCategory2' }),
				])
			);
		});

		it('should not delete category with invalid id', async () => {
			const response = await request(baseUrl)
				.delete('/category/679f462818947c0fa463a88f')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(400);
		});
	});

	describe('05 GET /category/filter', () => {
		it('should filter categories by field and value', async () => {
			await request(baseUrl)
				.post('/category')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'TestCategory2',
					icon: 'test-icon3.svg',
					englishName: 'TestCategory2',
				});

			const response = await request(baseUrl)
				.get('/category')
				.set('Authorization', `Bearer ${token}`)
				.query({ field: 'name', value: 'TestCategory2' });

			await request(baseUrl)
				.delete(`/category/${response.body.items[0]._id}`)
				.set('Authorization', `Bearer ${token}`);

			expect(response.status).toBe(200);
			expect(response.body.items).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ name: 'TestCategory2' }),
				])
			);
		});

		it('should return everything if field is missing', async () => {
			const response = await request(baseUrl)
				.get('/category')
				.set('Authorization', `Bearer ${token}`)
				.query({ value: 'TestCategory303' });
			const response2 = await request(baseUrl)
				.get('/category')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
			expect(response.body.items).toEqual(response2.body.items);
			expect(response.body.items).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ name: 'TestCategory3' }),
				])
			);
		});

		it('should return everything if value is missing', async () => {
			const response = await request(baseUrl)
				.get('/category')
				.set('Authorization', `Bearer ${token}`)
				.query({ field: 'name' });
			const response2 = await request(baseUrl)
				.get('/category')
				.set('Authorization', `Bearer ${token}`);

			expect(response.status).toBe(200);
			expect(response.body.items).toEqual(response2.body.items);

			expect(response.body.items).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ name: 'TestCategory3' }),
				])
			);
		});

		it('should return error if no categories match the filter', async () => {
			const response = await request(baseUrl)
				.get('/category')
				.set('Authorization', `Bearer ${token}`)
				.query({ field: 'name', value: 'NonExistentCategory' });
			expect(response.status).toBe(400);
			expect(response.body.message).toBe(
				'No result in the database for the search condition!'
			);
		});

		it('should return paginated categories', async () => {
			const response = await request(baseUrl)
				.get('/category')
				.set('Authorization', `Bearer ${token}`)
				.query({ page: 1 });
			expect(response.status).toBe(200);
			expect(response.body.pageCount).toEqual(1);
			expect(response.body.items.length).toBeLessThanOrEqual(10);
		});

		it('should return paginated categories with more page', async () => {
			for (let i = 0; i < 15; i++) {
				await request(baseUrl)
					.post('/category')
					.set('Authorization', `Bearer ${token}`)
					.send({
						name: `TestCategory${i}`,
						icon: 'test-icon.svg',
						englishName: `TestCategory${i}`,
					});
			}

			const response = await request(baseUrl)
				.get('/category')
				.set('Authorization', `Bearer ${token}`)
				.query({ page: 1 });
			expect(response.status).toBe(200);
			expect(response.body.pageCount).toEqual(2);
			expect(response.body.items.length).toBeLessThanOrEqual(10);
		});

		it('should return error when page is out of bounds', async () => {
			const response = await request(baseUrl)
				.get('/category')
				.set('Authorization', `Bearer ${token}`)
				.query({ page: 100 });
			expect(response.status).toBe(400);
			expect(response.body.message).toBe(
				'No result in the database for the search condition!'
			);
		});
	});
});
