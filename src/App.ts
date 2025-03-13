import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { IController } from './models/models';
import userController from './controllers/userController';
import orderController from './controllers/orderController';
import inventoryController from './controllers/inventoryController';
import foodController from './controllers/foodController';
import tokenValidationController from './controllers/tokenValidationController';
import materialController from './controllers/materialController';
import categoryController from './controllers/categoryController';
import imagesController from './controllers/imageController';
import GoogleDriveManager from './helpers/googleDriveHelper';
import webSocetController from './controllers/websocketController';
import YAML from 'yamljs';
import ImplementMiddleware from './helpers/middlewareHelper';
import {
	categoryModel,
	foodModel,
	materialChangeModel,
	materialModel,
	orderModel,
} from './models/mongooseSchema';
import statisticController from './controllers/statisticController';

require('dotenv').config();

class App {
	public app: express.Application;
	private startTime: number;

	constructor(controllers: IController[]) {
		this.startTime = Date.now();

		this.app = express();
		ImplementMiddleware.init(this.app);
		controllers.forEach((controller) => {
			this.app.use(`${controller.endPoint}`, controller.router);
		});

		const mongoUri = process.env.MONGO_URI || '';
		const mode: string = process.env.MODE?.toString() || '';
		if (mode === 'test') {
			console.log('\x1b[41m%s\x1b[0m', 'Test mode');
			this.connectToTheDatabase(mongoUri + 'Test');
			this.app.use('/drop', async (req: Request, res: Response) => {
				await categoryModel.collection.drop();
				await foodModel.collection.drop();
				await orderModel.collection.drop();
				await materialModel.collection.drop();
				await materialChangeModel.collection.drop();
				console.log('\x1b[42m%s\x1b[0m', 'Database dropped');
				res.send('Database dropped');
			});
		} else {
			this.connectToTheDatabase(mongoUri);
			GoogleDriveManager.init();
			webSocetController.init();
			const swaggerjsdoc = require('swagger-jsdoc');
			const swagger = require('swagger-ui-express');
			this.app.use(
				'/',
				swagger.serve,
				swagger.setup(swaggerjsdoc(YAML.load('./src/swagger/swagger.yaml')))
			);
		}
		console.log('App started in', Date.now() - this.startTime, 'ms');
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
	new inventoryController(),
	new foodController(),
	new tokenValidationController(),
	new materialController(),
	new categoryController(),
	new imagesController(),
	new statisticController(),
]);
