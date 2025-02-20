import express from 'express';
import mongoose from 'mongoose';
import { IController } from './models/models';
import userController from './controllers/userController';
import orderController from './controllers/orderController';
import materialController from './controllers/materialController';
import foodController from './controllers/foodController';
import tokenValidationController from './controllers/tokenValidationController';
import unitController from './controllers/unitController';
import categoryController from './controllers/categoryController';
import imagesController from './controllers/imageController';
import GoogleDriveManager from './helpers/googleDriveHelper';
import webSocetController from './controllers/websocketController';
import YAML from 'yamljs';
import ImplementMiddleware from './helpers/middlewareHelper';
import { userModel } from './models/mongooseSchema';

require('dotenv').config();

class App {
	public app: express.Application;
	private swaggerjsdoc = require('swagger-jsdoc');
	private swagger = require('swagger-ui-express');
	constructor(controllers: IController[]) {
		this.app = express();
		ImplementMiddleware.init(this.app);

		const mongoUri = process.env.MONGO_URI || '';
		const isTest: string = process.env.IS_TEST?.toString() || '';
		if (isTest == 'TRUE' || isTest == 'true') {
			console.log('Test mode');
			this.connectToTheDatabase(mongoUri + 'Test');
			mongoose.connection.dropDatabase();
			userModel.insertMany([
				{
					name: 'adminUser',
					password:
						'$2b$12$EfnHl3cYsaFgAQwFjv.Qee7vePCWWKloRoSRG3uiJOuEkkB0F7xBm',
					role: 'admin',
					email: 'admin@gmail.com',
				},
			]);
		} else {
			this.connectToTheDatabase(mongoUri);
			GoogleDriveManager.init();
			webSocetController.init();
		}

		controllers.forEach((controller) => {
			this.app.use(`${controller.endPoint}`, controller.router);
		});

		this.app.use(
			'/',
			this.swagger.serve,
			this.swagger.setup(
				this.swaggerjsdoc(YAML.load('./src/swagger/swagger.yaml'))
			)
		);
	}

	public listen(): void {
		this.app.listen(5005, () => {
			console.log('App listening on http://localhost:5005');
		});
	}

	private connectToTheDatabase(mongoUri: string) {
		mongoose.set('strictQuery', true);
		mongoose
			.connect(mongoUri)
			.catch(() =>
				console.log(
					'\x1b[41m%s\x1b[0m',
					'Unable to connect to the server. Please start MongoDB.'
				)
			);

		mongoose.connection.on('error', (error) => {
			console.log(
				'\x1b[41m%s\x1b[0m',
				`Mongoose error message: ${error.message}`
			);
		});
		mongoose.connection.on('connected', () => {
			console.log('Connected to MongoDB server.');
			this.listen();
		});
	}
}

new App([
	new userController(),
	new orderController(),
	new materialController(),
	new foodController(),
	new tokenValidationController(),
	new unitController(),
	new categoryController(),
	new imagesController(),
]);
// TODO: Implement: statistic controller
// TODO: Implement: 2fa
