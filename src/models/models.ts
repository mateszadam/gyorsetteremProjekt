import { Router, Request, Response } from 'express';

interface User {
	_id: string;
	name: string;
	password: string;
	role: string | undefined;
	token: string | undefined;
}

interface Material {
	_id: string;
	name: string;
	quantity: number;
	message: string;
}

interface Food {
	_id: string;
	material: FoodMaterial[];
	price: number;
	name: string;
}

interface FoodMaterial {
	name: string;
	quantity: number;
}
interface Order {
	_id?: string;
	costumerID: string;
	isFinished: boolean;
	orderedProducts: {
		name: string;
		quantity: number;
	}[];
}
interface IController {
	router: Router;
	endPoint: String;
}

export { User, Material, IController, Food, Order };
