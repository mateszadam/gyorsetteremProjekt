const request = require('supertest');
require('dotenv').config();

const baseUrl = process.env.BASE_URL;
exports.baseUrl = baseUrl;
let token = '';

describe('userController Integration Tests', () => {
	beforeAll(async () => {
		await request(baseUrl).post('/drop');

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
	describe('05 POST /user/picture/change/:newImageName', () => {
		it('should change the profile picture of a user', async () => {
			const newImageName = 'angel-svgrepo-com.svg';
			const response = await request(baseUrl)
				.post(`/user/picture/change/${newImageName}`)
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);
		});

		it('should change the profile picture when image not exist', async () => {
			const newImageName = 'newProfilePic.jpg';
			const response = await request(baseUrl)
				.post(`/user/picture/change/${newImageName}`)
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(400);
			expect(response.body).toEqual({ message: 'Image does not exist!' });
		});

		it('should return error if new image name does not exist', async () => {
			const newImageName = 'nonExistentPic.jpg';
			const response = await request(baseUrl)
				.post(`/user/picture/change/${newImageName}`)
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(400);
		});
	});
	describe('06 POST /user/register/admin', () => {
		it('should register a new admin', async () => {
			const response = await request(baseUrl)
				.post('/user/register/admin')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'TestAdmin',
					password: 'Admin@1234',
					email: 'testadmin@example.com',
					role: 'admin',
				});
			expect(response.status).toBe(201);
		});
		it('should register a new kitchen', async () => {
			const response = await request(baseUrl)
				.post('/user/register/admin')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'TestAdmin2',
					password: 'Admin@1234',
					email: 'testadmin@example.com',
					role: 'kitchen',
				});
			expect(response.status).toBe(201);
		});
		it('should register a new salesman', async () => {
			const response = await request(baseUrl)
				.post('/user/register/admin')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'TestAdmin3',
					password: 'Admin@1234',
					email: 'testadmin@example.com',
					role: 'salesman',
				});
			expect(response.status).toBe(201);
		});

		it('should return error if role is invalid', async () => {
			const response = await request(baseUrl)
				.post('/user/register/admin')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'InvalidRoleUser',
					password: 'Invalid@1234',
					email: 'invalidrole@example.com',
					role: 'invalidRole',
				});
			expect(response.status).toBe(400);
			expect(response.body).toEqual({
				message: 'The provided permission does not exist!',
			});
		});

		it('should return error if password is not provided', async () => {
			const response = await request(baseUrl)
				.post('/user/register/admin')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'NoPasswordUser',
					email: 'nopassword@example.com',
					role: 'admin',
				});
			expect(response.status).toBe(400);
			expect(response.body).toEqual({ message: 'Password is required!' });
		});

		it('should return error if email is not provided', async () => {
			const response = await request(baseUrl)
				.post('/user/register/admin')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: 'NoEmailUser',
					password: 'NoEmail@1234',
					role: 'admin',
				});
			expect(response.status).toBe(400);
			expect(response.body).toEqual({ message: 'Email is required!' });
		});
		afterAll(async () => {
			const users = await request(baseUrl)
				.get('/user/all')
				.set('Authorization', `Bearer ${token}`);

			users.body.forEach(async (user) => {
				if (user.name.includes('TestAdmin')) {
					await request(baseUrl)
						.delete(`/user/delete/admin/${user._id}`)
						.set('Authorization', `Bearer ${token}`);
				}
			});
		});
	});
});
