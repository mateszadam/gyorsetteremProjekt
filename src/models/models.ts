import { Router, Request, Response } from 'express';

interface User {
	_id: string;
	name: string;
	password: string;
	role: string | undefined;
	email: string | undefined;
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
	isEnabled: boolean;
	category: string | undefined;
}

interface FoodMaterial {
	name: string;
	quantity: number;
}
interface Order {
	_id?: string;
	costumerID: string;
	isFinished: boolean;
	finishedTime: Date;
	orderedTime: Date;
	finishedCokingTime: Date;
	orderedProducts: {
		name: string;
		quantity: number;
	}[];
}
interface IController {
	router: Router;
	endPoint: String;
}

function getRawId(id: string) {
	return id.toString().replace('new ObjectId(', '').replace(')', '');
}

function getObjectID(id: string) {
	return 'ObjectId(' + id + ')';
}

export { User, Material, IController, Food, getRawId, getObjectID, Order };
