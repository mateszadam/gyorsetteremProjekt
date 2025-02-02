import { Schema, SchemaDefinition, model } from 'mongoose';

const userSchema = new Schema<SchemaDefinition>(
	{
		_id: {},
		name: {
			type: String,
			required: true,
			unique: true,
		},
		password: {
			type: String,
			required: true,
		},
		role: {
			type: String,
			required: true,
			default: 'customer',
		},
		email: {
			type: String,
			required: true,
		},
		token: {
			type: String,
			default: '',
		},
	},
	{
		versionKey: false,
		id: false,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

const foodSchema = new Schema<SchemaDefinition>(
	{
		_id: {},
		name: {
			type: String,
			required: true,
			unique: true,
		},
		material: [
			{
				name: {
					type: String,
					required: true,
				},
				quantity: {
					type: Number,
					required: true,
				},
			},
		],
		price: {
			type: Number,
			required: true,
		},
		isEnabled: {
			type: Boolean,
			required: true,
			default: true,
		},
		category: {
			type: String,
		},
	},
	{
		versionKey: false,
		id: false,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

const materialSchema = new Schema<SchemaDefinition>(
	{
		_id: {},
		name: {
			type: String,
			required: true,
		},
		quantity: {
			type: Number,
			required: true,
		},
		message: {
			type: String,
			required: true,
		},
		date: {
			type: Date,
			default: new Date(),
		},
	},
	{
		versionKey: false,
		id: false,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

const unitOfMeasure = new Schema<SchemaDefinition>(
	{
		_id: {},
		materialName: {
			type: String,
			required: true,
			unique: true,
		},
		unit: {
			type: String,
			required: true,
		},
	},
	{
		versionKey: false,
		id: false,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

const categorySchema = new Schema<SchemaDefinition>(
	{
		_id: {},
		name: {
			type: String,
			required: true,
			unique: true,
		},
		icon: {
			type: String,
			required: true,
		},
	},
	{
		versionKey: false,
		id: false,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

const orderSchema = new Schema<SchemaDefinition>(
	{
		_id: {},
		costumerID: {
			type: String,
			required: true,
		},
		isFinished: {
			type: Boolean,
			required: true,
			default: false,
		},
		orderedTime: {
			type: Date,
			default: Date.now(),
		},
		finishedCokingTime: {
			type: Date,
		},
		finishedTime: {
			type: Date,
		},
		orderedProducts: [
			{
				name: {
					type: String,
					required: true,
				},
				quantity: {
					type: Number,
					required: true,
				},
			},
		],
	},
	{
		versionKey: false,
		id: false,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

export const userModel = model('userId', userSchema, 'users');
export const foodModel = model('foodId', foodSchema, 'foods');
export const orderModel = model('orderId', orderSchema, 'orders');
export const materialModel = model('materialId', materialSchema, 'materials');
export const categoryModel = model('categoryId', categorySchema, 'categories');

export const unitOfMeasureModel = model(
	'unitId',
	unitOfMeasure,
	'unitOfMeasures'
);
