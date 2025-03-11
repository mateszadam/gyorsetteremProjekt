const MongoClient = require('mongodb').MongoClient;
const Types = require('mongoose').Types;

async function seed() {
	try {
		const uri = 'mongodb://localhost:27017/loginService';
		const client = new MongoClient(uri);
		await client.connect();
		console.log('connected to db');

		const categoriesCollections = client
			.db('loginService')
			.collection('categories');
		const foodsCollection = client.db('loginService').collection('foods');
		const materialChangesCollection = client
			.db('loginService')
			.collection('materialChanges');
		const materialCollection = client
			.db('loginService')
			.collection('materials');
		const usersCollection = client.db('loginService').collection('users');
		const ordersCollection = client.db('loginService').collection('orders');

		usersCollection.drop();
		categoriesCollections.drop();
		foodsCollection.drop();
		materialChangesCollection.drop();
		materialCollection.drop();
		ordersCollection.drop();

		const userID = new Types.ObjectId('67b8c8e66c3a754a88001564');
		const categoryID = new Types.ObjectId('67b8c983c18f04f481b45335');
		const foodID = new Types.ObjectId('67b8c9a759b0eba0959a2d0f');
		const materialID = new Types.ObjectId('67b8c9a959b0eba0959a2d54');
		const materialChangeID = new Types.ObjectId('67b8c9a959b0eba0959a2d9a');

		await usersCollection.insertOne({
			_id: userID,
			name: 'admin',
			email: 'email@email.com',
			password: '$2a$12$jsBUNrJNpjjkt95e0rV6KOC2ecGORWw4jeOZExDpZxp1s0Ks8Qeqq',
			role: 'admin',
			profilePicture: 'no-image.svg',
			createdAt: new Date(),
		});

		await categoriesCollections.insertOne({
			_id: categoryID,
			name: 'kategória',
			englishName: 'category',
			icon: 'icon',
		});

		await foodsCollection.insertOne({
			_id: foodID,
			name: 'étel',
			englishName: 'food',
			description: 'leírás',
			materials: [{ materialID: materialID, quantity: 1 }],
			price: 1000,
			categoryId: categoryID,
			subCategoryId: [categoryID],
			image: 'no-image.svg',
		});

		await materialCollection.insertOne({
			_id: materialID,
			name: 'anyag',
			englishName: 'material',
			unit: 'db',
		});

		await materialChangesCollection.insertOne({
			_id: materialChangeID,
			materialId: materialID,
			quantity: 1,
			message: 'add',
			date: new Date(),
		});
		await ordersCollection.insertOne({
			_id: new Types.ObjectId('67b8c9a959b0eba0959a2d9b'),
			userId: userID,
			orderedTime: new Date(),
			totalPrice: 1000,
			foods: [
				{
					foodId: foodID,
					quantity: 1,
				},
			],
			finishedCokingTime: new Date(),
			finishedTime: null,
			orderNumber: 1002,
		});
		console.log('seeded');
		client.close();
	} catch (error) {
		console.log(error);
	}
}
seed();
