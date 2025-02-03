import { Router, Request, Response } from 'express';
import fileUpload, { UploadedFile } from 'express-fileupload';
import { IController } from '../models/models';
import fs from 'fs';

import {
	authenticateAdminToken,
	authenticateToken,
} from '../services/tokenService';
import { defaultAnswers } from '../helpers/statusCodeHelper';

export default class imagesController implements IController {
	public router = Router();
	public endPoint = '/images';

	constructor() {
		this.router.use(fileUpload());
		/**
		 * Initializes the image controller, setting up routes for image operations.
		 *
		 * @swagger
		 * /images/{imageName}:
		 *   get:
		 *     summary: Retrieve an image
		 *     tags: [Images]
		 *     parameters:
		 *       - in: path
		 *         name: imageName
		 *         required: true
		 *         schema:
		 *           type: string
		 *         description: The name of the image to retrieve
		 *     responses:
		 *       200:
		 *         description: An image file.
		 *         content:
		 *           image/svg+xml:
		 *             schema:
		 *               type: string
		 *               format: binary
		 *       400:
		 *         description: Bad request
		 *   delete:
		 *     summary: Delete an image
		 *     tags: [Images]
		 *     parameters:
		 *       - in: path
		 *         name: imageName
		 *         required: true
		 *         schema:
		 *           type: string
		 *         description: The name of the image to delete
		 *     responses:
		 *       200:
		 *         description: Image deleted successfully
		 *       400:
		 *         description: Bad request
		 *
		 * /images:
		 *   post:
		 *     summary: Upload an image
		 *     tags: [Images]
		 *     requestBody:
		 *       required: true
		 *       content:
		 *         multipart/form-data:
		 *           schema:
		 *             type: object
		 *             properties:
		 *               image:
		 *                 type: string
		 *                 format: binary
		 *     responses:
		 *       200:
		 *         description: Image uploaded successfully
		 *       400:
		 *         description: Bad request
		 */
		this.router.get('/:imageName', authenticateToken, this.getImage);
		this.router.delete('/:imageName', authenticateToken, this.deleteImage);

		this.router.post('/', authenticateAdminToken, this.uploadImage);
	}

	private getImage = async (req: Request, res: Response) => {
		try {
			var mime = {
				jpg: 'image/jpeg',
				png: 'image/png',
				svg: 'image/svg+xml',
			};
			const image = req.params.imageName;
			const filePath = `./src/images/${image}`;
			if (image) {
				if (fs.existsSync(filePath)) {
					const ext = image.split('.')[1] as 'jpg' | 'png' | 'svg';
					res.writeHead(200, {
						'Content-Type': mime[ext] || 'text/plain',
					});
					const a = fs.createReadStream(`./src/images/${image}`).pipe(res);
					if (!a) {
						throw Error('Error in file handling');
					}
				} else {
					throw Error('File not exist');
				}
			} else {
				throw Error('Image name not found in request');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};

	private uploadImage = async (req: Request, res: Response) => {
		try {
			if (req.files && Object.keys(req.files).length > 0) {
				const image = req.files.image as UploadedFile;
				const uploadPath = './src/images/' + image.name;

				await image.mv(uploadPath, (err: any) => {
					if (err) {
						return defaultAnswers.badRequest(res, err.message);
					}
					res.status(200).send('Image uploaded successfully');
				});
			} else {
				throw new Error('No files were uploaded.');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
	private deleteImage = async (req: Request, res: Response) => {
		try {
			const imageName = req.params.imageName;
			const imagePath = `./src/images/${imageName}`;

			if (fs.existsSync(imagePath)) {
				fs.unlinkSync(imagePath);
				res.status(200).send('Image deleted successfully');
			} else {
				throw new Error('Image not found');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
}
