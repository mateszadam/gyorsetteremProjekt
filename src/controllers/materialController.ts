import { Router, Request, Response } from 'express';
import { IController, Material } from '../models/models';
import { foodModel, materialModel, orderModel } from '../models/mongooseSchema';
import { authenticateAdminToken, isAuthValid } from '../services/tokenService';
import { log } from 'console';
import { defaultAnswers } from '../helpers/statusCodeHelper';

export default class materialController implements IController {
	public router = Router();
	public endPoint = '/material';
	private material = materialModel;
	private food = foodModel;
	/**
	 * @openapi
	 * /material/add:
	 *   post:
	 *     summary: Add new materials
	 *     tags: [Material]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             properties:
	 *               itemsToInsert:
	 *                 type: array
	 *                 items:
	 *                   $ref: '#/definitions/Material'
	 *                 description: List of materials to add
	 *     responses:
	 *       200:
	 *         description: Materials added successfully
	 *       400:
	 *         description: Bad request
	 *       401:
	 *         description: Not authorized
	 *
	 * /material/stock:
	 *   get:
	 *     summary: Get all materials in stock
	 *     tags: [Material]
	 *     responses:
	 *       200:
	 *         description: List of materials in stock
	 *       400:
	 *         description: Bad request
	 *       401:
	 *         description: Not authorized
	 *
	 * /material/all:
	 *   get:
	 *     summary: Get all materials from recipes
	 *     tags: [Material]
	 *     responses:
	 *       200:
	 *         description: List of all materials from recipes
	 *       400:
	 *         description: Bad request
	 *       401:
	 *         description: Not authorized
	 *
	 * definitions:
	 *   Material:
	 *     type: object
	 *     required:
	 *       - name
	 *       - quantity
	 *       - message
	 *     properties:
	 *       name:
	 *         type: string
	 *         default: Kenyér
	 *       quantity:
	 *         type: number
	 *         default: 2
	 *       message:
	 *         type: string
	 *         default: Vásárlás
	 */
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
			const inputMaterials: Material[] = req.body.itemsToInsert;
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
					$project: {
						_id: 0,
						name: '$_id',
						inStock: 1,
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
					$project: {
						_id: 0,
						name: '$_id',
						inStock: 1,
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
