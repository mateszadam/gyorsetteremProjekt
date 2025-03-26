import { Router } from 'express';
import { ObjectId } from 'mongoose';

interface IUser {
	_id: ObjectId;
	name: string;
	password: string;
	role: string;
	profilePicture: String;
	email: string | undefined;
	tokenId: string | undefined;
}

interface ICategory {
	_id: ObjectId;
	name: string;
	icon: string;
	englishName?: string;
	mainCategory?: string;
}

interface IMaterialChange {
	_id?: ObjectId;
	materialId?: ObjectId;
	name?: string;
	quantity: number;
	message: string;
	inStock?: number;
}

interface IMaterial {
	_id?: ObjectId;
	name: string;
	englishName?: string;
	unit: string;
	usageOneWeekAgo?: number;
}

interface IFood {
	_id?: ObjectId;
	materials: IFoodMaterial[];
	price: number;
	name: string;
	englishName?: string;
	isEnabled: boolean;
	subCategoryId: string[] | undefined;
	categoryId: ObjectId;
	isDeleted?: boolean;
}

interface IFoodMaterial {
	_id: ObjectId;
	quantity: number;
}
interface IOrder {
	_id: ObjectId;
	costumerId: ObjectId;
	finishedTime: Date | undefined;
	orderedTime: Date;
	finishedCokingTime: Date | undefined;
	orderedProducts: IOrderedProducts[];
	orderNumber?: Number;
	totalPrice: number;
}
interface IOrderFull {
	_id: ObjectId;
	costumerId: ObjectId;
	orderedTime: string;
	totalPrice: number;
	finishedCokingTime: string | null;
	finishedTime: string | null;
	orderedProducts: {
		quantity: number;
		details: IFood;
	}[];
	orderNumber: number;
}

interface IController {
	router: Router;
	endPoint: String;
}

interface IMaterialWithStock extends IMaterial {
	inStock: number;
	isEnough: boolean;
}
interface IOrderedProducts {
	_id: ObjectId;
	quantity: number;
}

interface IOrderedProductFull {
	_id: string;
	costumerId: string;
	orderedTime: string;
	totalPrice: number;
	finishedCokingTime: any;
	finishedTime: any;
	orderedProducts: IOrderedProduct[];
	orderNumber: number;
}
interface IOrderedProduct {
	quantity: number;
	details: IFood;
}

export {
	IUser,
	IMaterialChange,
	IController,
	IFood,
	IOrder,
	IMaterial,
	ICategory,
	IOrderedProductFull,
	IOrderFull,
	IMaterialWithStock,
};
