import express from 'express';
import mongoose from 'mongoose';
import { IController } from './models/models';
import { Router, Request, Response } from 'express';
import {
	categoryModel,
	foodModel,
	materialModel,
	orderModel,
	unitOfMeasureModel,
	userModel,
} from './models/mongooseSchema';
import morgan from 'morgan';
import cors from 'cors';
import userController from './controllers/userController';
import orderController from './controllers/orderController';
import materialController from './controllers/materialController';
import foodController from './controllers/foodController';

import tokenValidationController from './controllers/tokenValidationController';
import unitController from './controllers/unitController';
import categoryController from './controllers/categoryController';
import { rateLimit } from 'express-rate-limit';
import imagesController from './controllers/imageController';
import GoogleDriveManager from './helpers/googleDriveHelper';
import webSocetController from './controllers/websocketController';
const { Worker } = require('worker_threads');

require('dotenv').config();
export default class App {
	public app: express.Application;
	private swaggerjsdoc = require('swagger-jsdoc');
	private swagger = require('swagger-ui-express');
	private http = require('http');
	private WebSocket = require('ws');
	constructor(controllers: IController[]) {
		this.app = express();
		this.connectToTheDatabase();
		this.app.use(express.json());
		this.app.use(cors());
		this.app.use(morgan('dev'));
		const limiter = rateLimit({
			windowMs: 15 * 60 * 1000,
			limit: 100,
			standardHeaders: 'draft-8',
			legacyHeaders: false,
		});
		this.app.use(limiter);

		// TODO: Implement helmet

		GoogleDriveManager.init();
		webSocetController.initializeWebSocket();
		controllers.forEach((controller) => {
			this.app.use(`${controller.endPoint}`, controller.router);
		});
	}

	public listen(): void {
		const optionsForSwagger = {
			definition: {
				openapi: '3.0.0',
				info: {
					title: 'Gyors éttermi rendszer API dokumentáció',
					description:
						'A /user/login tól kapott tokent kell be másolni az autentikációhoz',
					version: '0.0.2',
				},
				servers: [
					{
						url: 'https://mateszadam.koyeb.app/',
					},
					{
						url: 'http://localhost:5005/',
					},
				],
				components: {
					securitySchemes: {
						bearerAuth: {
							type: 'http',
							scheme: 'bearer',
							bearerFormat: 'JWT',
							description:
								'Enter your bearer token in the format **Bearer &lt;token>**',
						},
					},
				},
				security: [
					{
						bearerAuth: [],
					},
				],
			},
			apis: [
				'./src/documentation/swagger.ts',
				'./src/App.ts',
				'./src/controllers/*.ts',
			],
		};
		this.app.use(
			'/',
			this.swagger.serve,
			this.swagger.setup(this.swaggerjsdoc(optionsForSwagger))
		);

		this.app.listen(5005, () => {
			console.log('App listening on the port 5005');
		});
	}

	private connectToTheDatabase() {
		mongoose.set('strictQuery', true);
		const mongoUri = process.env.MONGO_URI;
		mongoose
			.connect(mongoUri!)
			.catch(() =>
				console.log('Unable to connect to the server. Please start MongoDB.')
			);

		mongoose.connection.on('error', (error) => {
			console.log(`Mongoose error message: ${error.message}`);
		});
		mongoose.connection.on('connected', () => {
			console.log('Connected to MongoDB server.');
			this.listen();
		});
		userModel.init();
		foodModel.init();
		orderModel.init();
		materialModel.init();
		categoryModel.init();
		unitOfMeasureModel.init();
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
