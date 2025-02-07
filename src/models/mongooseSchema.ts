import { Schema, SchemaDefinition, model } from 'mongoose';

const userSchema = new Schema<SchemaDefinition>(
	{
		_id: Schema.Types.ObjectId,
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
		profilePicture: {
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
export const userModel = model('userId', userSchema, 'users');

const categorySchema = new Schema<SchemaDefinition>(
	{
		_id: Schema.Types.ObjectId,
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
export const categoryModel = model('categoryId', categorySchema, 'categories');

const foodSchema = new Schema<SchemaDefinition>(
	{
		_id: Schema.Types.ObjectId,
		name: {
			type: String,
			required: true,
			unique: true,
		},
		material: [
			{
				name: {
					type: String,
					unique: true,
					required: true,
					lowercase: true,
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
		categoryId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'categoryId',
		},
		image: {
			type: String,
			default: 'no-image.svg',
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
		_id: Schema.Types.ObjectId,
		name: {
			type: String,
			required: true,
			lowercase: true,
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
			validate: {
				validator: function (v: Date) {
					return v <= new Date();
				},
				message: `Az aktuális dátumnál nem adhat meg későbbi dátumot!`,
			},
		},
	},
	{
		versionKey: false,
		id: false,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);
export const materialModel = model('materialId', materialSchema, 'materials');

const unitOfMeasure = new Schema<SchemaDefinition>(
	{
		_id: Schema.Types.ObjectId,
		materialName: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
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

const orderSchema = new Schema<SchemaDefinition>(
	{
		_id: Schema.Types.ObjectId,
		costumerId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'userId',
		},
		orderedTime: {
			type: Date,
			default: Date.now(),
			validate: {
				validator: function (v: Date) {
					return v <= new Date();
				},
				message: 'Az aktuális dátumnál nem adhat meg későbbi dátumot!',
			},
		},
		finishedCokingTime: {
			type: Date,
			validate: {
				validator: function (v: Date) {
					return v <= new Date();
				},
				message: 'Az aktuális dátumnál nem adhat meg későbbi dátumot!',
			},
		},
		finishedTime: {
			type: Date,
			validate: {
				validator: function (v: Date) {
					return v >= new Date();
				},
				message: 'Az aktuális dátumnál nem adhat meg korábbi dátumot!',
			},
		},
		orderedProducts: [
			{
				name: {
					type: String,
					required: true,
					lowercase: true,
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

export const foodModel = model('foodId', foodSchema, 'foods');
export const orderModel = model('orderId', orderSchema, 'orders');

export const unitOfMeasureModel = model(
	'unitId',
	unitOfMeasure,
	'unitOfMeasures'
);
