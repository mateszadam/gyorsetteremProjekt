import { Router, Request, Response } from 'express';
import { IController, IMaterial } from '../models/models';
import { foodModel, materialModel, orderModel } from '../models/mongooseSchema';
import { authenticateAdminToken, isAuthValid } from '../services/tokenService';
import { log } from 'console';
import { defaultAnswers } from '../helpers/statusCodeHelper';

/**
 * Controller for managing materials in the system
 * @class materialController
 * @implements {IController}
 *
 * @swagger
 * tags:
 *   name: Material
 *   description: Material management endpoints
 *
 * @swagger
 * components:
 *   schemas:
 *     Material:
 *       type: object
 *       required:
 *         - name
 *         - quantity
 *         - message
 *       properties:
 *         name:
 *           type: string
 *           description: Name of the material
 *           example: "Kenyér"
 *         quantity:
 *           type: number
 *           description: Amount of material
 *           example: 2
 *         message:
 *           type: string
 *           description: Message associated with material entry
 *           example: "Vásárlás"
 *
 * @swagger
 * /material/add:
 *   post:
 *     summary: Add new materials to inventory
 *     tags: [Material]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               $ref: '#/components/schemas/Material'
 *     responses:
 *       200:
 *         description: Materials successfully added
 *       400:
 *         description: Bad request - Invalid input
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *
 * @swagger
 * /material/stock:
 *   get:
 *     summary: Get current material stock levels
 *     tags: [Material]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of materials with stock levels
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   inStock:
 *                     type: number
 *                   unit:
 *                     type: string
 *       401:
 *         description: Unauthorized access
 *
 * @swagger
 * /material/all:
 *   get:
 *     summary: Get all materials from recipes and stock
 *     tags: [Material]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Combined list of materials from recipes and stock
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   inStock:
 *                     type: number
 *                   unit:
 *                     type: string
 *       401:
 *         description: Unauthorized access
 */
export default class materialController implements IController {
	public router = Router();
	public endPoint = '/material';
	private material = materialModel;
	private food = foodModel;
	constructor() {
		this.router.post('/add', authenticateAdminToken, this.addMaterial);
		this.router.get('/stock', authenticateAdminToken, this.getAllMaterial);
		this.router.get(
			'/all',
			authenticateAdminToken,
			this.getAllMaterialFromRecipe
		);
	}

	private addMaterial = async (req: Request, res: Response) => {
		try {
			const inputMaterials: IMaterial[] = req.body;
			if (inputMaterials) {
				const databaseAnswer = await this.material.insertMany(inputMaterials);

				if (databaseAnswer) {
					defaultAnswers.ok(res);
				} else {
					throw Error('Error in database');
				}
			} else {
				throw Error('No materials found to insert');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};

	private getAllMaterial = async (req: Request, res: Response) => {
		try {
			const materials = await this.material.aggregate([
				{
					$group: {
						_id: '$name',
						inStock: { $sum: '$quantity' },
					},
				},
				{
					$lookup: {
						from: 'unitOfMeasures',
						localField: '_id',
						foreignField: 'materialName',
						as: 'UOM',
					},
				},
				{
					$project: {
						_id: 1,
						inStock: 1,
						unit: { $ifNull: [{ $arrayElemAt: ['$UOM.unit', 0] }, null] },
					},
				},
			]);
			if (materials) {
				res.status(200).send(materials);
			} else {
				throw Error('Error in database');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
	private getAllMaterialFromRecipe = async (req: Request, res: Response) => {
		try {
			const materialsInStock = await this.material.aggregate([
				{
					$facet: {
						stockMaterials: [
							{
								$group: {
									_id: '$name',
									inStock: { $sum: '$quantity' },
								},
							},
							{
								$project: {
									_id: 0,
									name: '$_id',
									inStock: 1,
								},
							},
						],
						recipeMaterials: [
							{
								$lookup: {
									from: 'foods',
									pipeline: [
										{ $unwind: '$material' },
										{
											$group: {
												_id: '$material.name',
											},
										},
									],
									as: 'recipes',
								},
							},
							{ $unwind: '$recipes' },
							{
								$project: {
									name: '$recipes._id',
									inStock: { $literal: 0 },
								},
							},
						],
					},
				},
				{
					$project: {
						combined: {
							$setUnion: ['$stockMaterials', '$recipeMaterials'],
						},
					},
				},
				{ $unwind: '$combined' },
				{
					$group: {
						_id: '$combined.name',
						inStock: { $max: '$combined.inStock' },
					},
				},
				{
					$lookup: {
						from: 'unitOfMeasures',
						localField: '_id',
						foreignField: 'materialName',
						as: 'UOM',
					},
				},
				{
					$project: {
						_id: 1,
						inStock: 1,
						unit: { $ifNull: [{ $arrayElemAt: ['$UOM.unit', 0] }, null] },
					},
				},
			]);
			if (materialsInStock) {
				res.status(200).send(materialsInStock);
			} else {
				throw Error('Error in database');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
}
