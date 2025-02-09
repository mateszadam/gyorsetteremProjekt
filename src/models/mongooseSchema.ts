import { Schema, SchemaDefinition, model } from 'mongoose';

const userSchema = new Schema<SchemaDefinition>(
	{
		_id: Schema.Types.ObjectId,
		name: {
			type: String,
			required: [true, 'A név kitöltése kötelező'],
			unique: [true, 'A felhasználónév már foglalt'],
		},
		password: {
			type: String,
			required: [true, 'A jelszó kitöltése kötelező'],
		},
		role: {
			type: String,
			required: [true, 'A név kitöltése kötelező'],
			default: 'customer',
		},
		email: {
			type: String,
			required: [true, 'A név kitöltése kötelező'],
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
			required: [true, 'A név kitöltése kötelező'],
			unique: [true, 'A  kategória név már létezik'],
		},
		icon: {
			type: String,
			required: [true, 'Az ikon kitöltése kötelező'],
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
			required: [true, 'A név kitöltése kötelező'],
			unique: [true, 'Az étel neve már foglalt'],
		},
		materials: [
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
		price: {
			type: Number,
			required: [true, 'Az ár megadása kötelező'],
		},
		isEnabled: {
			type: Boolean,
			default: true,
		},
		categoryId: {
			type: Schema.Types.ObjectId,
			required: [true, 'Az kategória megadása kötelező'],
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
			required: [true, 'A név kitöltése kötelező'],
			lowercase: true,
			trim: true,
		},
		quantity: {
			type: Number,
			required: [true, 'A mennyiség megadása kötelező'],
		},
		message: {
			type: String,
			default: '',
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
			required: [true, 'A név megadása kötelező'],
			unique: [true, 'Az alapanyagnak már van mennyisége'],
			lowercase: true,
			trim: true,
		},
		unit: {
			type: String,
			required: [true, 'A mértékegység megadása kötelező'],
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
			required: [true, 'A vásárló megadása kötelező'],
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
					trim: true,
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
