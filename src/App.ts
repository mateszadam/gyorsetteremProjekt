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
import { log } from 'console';
import imagesController from './controllers/imageController';

export default class App {
	public app: express.Application;
	private swaggerjsdoc = require('swagger-jsdoc');
	private swagger = require('swagger-ui-express');
	private http = require('http');
	private WebSocket = require('ws');

	constructor(controllers: IController[]) {
		this.app = express();
		const server = this.http.createServer(this.app); // Create an HTTP server
		const wss = new this.WebSocket.Server({ server });
		this.connectToTheDatabase();
		this.app.use(express.json());
		this.app.use(cors());
		this.app.use(morgan('dev'));

		// Images service
		// https://www.svgrepo.com/collection/bakery-education-line-icons/

		// WebSocket service
		wss.on('connection', (ws: any) => {
			console.log('New client connected');

			// Handle messages from client
			ws.on('message', (message: any) => {
				console.log(`Received: ${message}`);

				// Broadcast message to all connected clients
				wss.clients.forEach((client: any) => {
					if (client.readyState === WebSocket.OPEN) {
						client.send(`Server: ${message}`);
					}
				});
			});

			// Handle client disconnection
			ws.on('close', () => {
				console.log('Client disconnected');
			});

			// Send a welcome message to the client
			ws.send('Welcome to the WebSocket server!');
		});

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
		mongoose
			.connect(
				'mongodb+srv://m001-student:m001-student@main.0030e.mongodb.net/loginService'
			)
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
