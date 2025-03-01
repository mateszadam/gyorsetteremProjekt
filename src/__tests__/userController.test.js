const e = require('cors');
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

		for (let i = 1; i <= 5; i++) {
			await request(baseUrl)
				.post('/user/register/admin')
				.set('Authorization', `Bearer ${token}`)
				.send({
					name: `TestSalesman${i}`,
					password: 'Test@1234',
					email: 'ssas@gmail.com',
					role: 'salesman',
				});
			await request(baseUrl)
				.post('/user/register/admin')
				.set('Authorization', `Bearer ${token}`)

				.send({
					name: `TestKitchen${i}`,
					password: 'Test@1234',
					email: 'ssas@gmail.com',
					role: 'kitchen',
				});
			await request(baseUrl)
				.post('/user/register/customer')
				.set('Authorization', `Bearer ${token}`)

				.send({
					name: `TestCustomer${i}`,
					password: 'Test@1234',
					email: 'ssas@gmail.com',
				});
		}
	}, 30000);
	describe('01 POST /user/register/customer', () => {
		it('should register a new customer', async () => {
			const response = await request(baseUrl)
				.post('/user/register/customer')
				.send({
					name: 'TestCustomer2e',
					password: 'Test@1234',
					email: 'testcustomer@example.com',
				});
			expect(response.status).toBe(201);
		});
	});

	describe('02 POST /user/login', () => {
		it('should login a user', async () => {
			const response = await request(baseUrl).post('/user/login').send({
				name: 'TestCustomer2e',
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
			response.body.items.forEach((user) => {
				expect(user).toEqual({
					_id: expect.any(String),
					name: expect.any(String),
					email: expect.any(String),
					role: expect.any(String),
					profilePicture: expect.any(String),
					registeredAt: expect.any(String),
				});
			});
		});

		it('should get all customers', async () => {
			const response = await request(baseUrl)
				.get('/user/all')
				.set('Authorization', `Bearer ${token}`)
				.query({ role: 'customer' });
			expect(response.status).toBe(200);
			expect(
				response.body.items.every((user) => user.role === 'customer')
			).toBe(true);
		});

		it('should get all admins', async () => {
			const response = await request(baseUrl)
				.get('/user/all')
				.set('Authorization', `Bearer ${token}`)
				.query({ role: 'admin' });
			expect(response.status).toBe(200);
			expect(response.body.items.every((user) => user.role === 'admin')).toBe(
				true
			);
		});

		it('should get all kitchen users', async () => {
			const response = await request(baseUrl)
				.get('/user/all')
				.set('Authorization', `Bearer ${token}`)
				.query({ role: 'kitchen' });

			expect(response.status).toBe(200);
			expect(response.body.items.every((user) => user.role === 'kitchen')).toBe(
				true
			);
		});

		it('should get all salesmen', async () => {
			const response = await request(baseUrl)
				.get('/user/all')
				.set('Authorization', `Bearer ${token}`)
				.query({ role: 'salesman' });
			expect(response.status).toBe(200);
			expect(
				response.body.items.every((user) => user.role === 'salesman')
			).toBe(true);
		});

		it('should paginate results', async () => {
			const response = await request(baseUrl)
				.get('/user/all')
				.set('Authorization', `Bearer ${token}`)
				.query({ page: 2, limit: 1 });
			expect(response.status).toBe(200);
			expect(response.body.items.length).toBe(1);
			expect(response.body.pageCount).toBe(17);
		});
	});

	describe('04 DELETE /user/delete/customer/:id', () => {
		it('should delete a customer by id', async () => {
			const users = await request(baseUrl)
				.get('/user/all')
				.set('Authorization', `Bearer ${token}`)
				.query({ limit: 1000 });
			const userId = users.body.items.find(
				(user) => user.name === 'TestCustomer2'
			)._id;

			const response = await request(baseUrl)
				.delete(`/user/delete/customer/${userId}`)
				.set('Authorization', `Bearer ${token}`);
			expect(response.status).toBe(200);

			const updatedUsers = await request(baseUrl)
				.get('/user/all')
				.set('Authorization', `Bearer ${token}`);
			expect(
				updatedUsers.body.items.some((user) => user.name === 'TestCustomer2')
			).toBe(false);
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
					name: 'TestAdmin0020',
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
					name: 'TestAdmin220',
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
					name: 'TestAdmin330',
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
				.set('Authorization', `Bearer ${token}`)
				.query({ limit: 1000 });

			users.body.items.forEach(async (user) => {
				if (user.name != 'adminUser') {
					await request(baseUrl)
						.delete(`/user/delete/admin/${user._id}`)
						.set('Authorization', `Bearer ${token}`);
				}
			});
		});
	});
});
