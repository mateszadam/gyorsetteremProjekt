const { error } = require('console');
const request = require('supertest');
require('dotenv').config();

const baseUrl = process.env.BASE_URL;
exports.baseUrl = baseUrl;
let token = '';

describe('userController Integration Tests', () => {
	beforeAll(async () => {
		const response = await request(baseUrl).post('/user/login').send({
			name: 'adminUser',
			password: 'adminUser!1',
		});
		token = response.body.token;
	});
	describe('01 POST /user/register/customer', () => {
		it('should register a new customer', async () => {
			const response = await request(baseUrl)
				.post('/user/register/customer')
				.send({
					name: 'TestCustomer2',
					password: 'Test@1234',
					email: 'testcustomer@example.com',
				});
			error(response.body);
			expect(response.status).toBe(201);
		});
	});

	describe('02 POST /user/login', () => {
		it('should login a user', async () => {
			const response = await request(baseUrl).post('/user/login').send({
				name: 'TestCustomer2',
				password: 'Test@1234',
			});
			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty('token');
			expect(response.body).toHaveProperty('role');
		});
	});

	describe('03 GET /user/all', () => {
		it('should get all users', async () => {
			const response = await request(baseUrl)
				.get('/user/all')
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
			expect(response.body).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ name: 'TestCustomer2' }),
				])
			);
		});
	});

	describe('04 DELETE /user/delete/customer/:id', () => {
		it('should delete a customer by id', async () => {
			const users = await request(baseUrl)
				.get('/user/all')
				.set('Authorization', `Bearer ${token}`);
			const userId = users.body.find(
				(user) => user.name === 'TestCustomer2'
			)._id;

			const response = await request(baseUrl)
				.delete(`/user/delete/customer/${userId}`)
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
		});
	});
});
