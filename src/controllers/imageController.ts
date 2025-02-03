import { Router, Request, Response } from 'express';
import fileUpload, { UploadedFile } from 'express-fileupload';
import { IController } from '../models/models';
import fs from 'fs';

import {
	authenticateAdminToken,
	authenticateToken,
} from '../services/tokenService';
import { defaultAnswers } from '../helpers/statusCodeHelper';
import GoogleDriveManager from '../helpers/googleDriveHelper';
export default class imagesController implements IController {
	public router = Router();
	public endPoint = '/images';

	constructor() {
		this.router.use(fileUpload());
		/**
		 * Initializes the image controller, setting up routes for image operations.
		 *
		 * @swagger
		 * /images/name/{imageName}:
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
		 * /images/all:
		 *   get:
		 *     summary: Get all uploaded image
		 *     tags: [Images]
		 *     responses:
		 *       200:
		 *         description: Get all image name
		 *       400:
		 *         description: Bad request
		 */
		this.router.get('/all', authenticateToken, this.listAllFiles);

		this.router.get('/name/:imageName', authenticateToken, this.getImage);
		// this.router.delete('/:imageName', authenticateToken, this.deleteImage);

		this.router.post('/', authenticateAdminToken, this.uploadImage);
	}
	private https = require('https');
	private utf8 = require('utf8');

	private getImage = async (req: Request, res: Response) => {
		try {
			var mime = {
				jpg: 'image/jpeg',
				png: 'image/png',
				svg: 'image/svg+xml',
			};
			const image = req.params.imageName;
			if (image) {
				if (fs.existsSync(`./src/images/${image}`)) {
					const ext = image.split('.')[1] as 'jpg' | 'png' | 'svg';
					res.writeHead(200, {
						'Content-Type': mime[ext] || 'text/plain',
					});
					fs.createReadStream(`./src/images/${image}`).pipe(res);
				} else {
					throw Error('Image not fount');
				}
			} else {
				throw Error('Image name not found in request');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
	// https://drive.google.com/drive/u/1/folders/1fGZ42ZFdgGLBCKMcKuIRwk3hFXIgbEPm
	private uploadImage = async (req: Request, res: Response) => {
		try {
			if (req.files && Object.keys(req.files).length > 0) {
				const image = req.files.image as UploadedFile;
				if (!image) {
					throw Error('No image found in context');
				}
				image.name = Buffer.from(image.name, 'ascii').toString('utf-8');
				const uploadPath = './src/images/' + image.name;
				if (!fs.existsSync(uploadPath)) {
					await image.mv(uploadPath, async (err: any) => {
						if (err) {
							return defaultAnswers.badRequest(res, err.message);
						}
						const message = await GoogleDriveManager.uploadFile(uploadPath);
						if (message) {
							res.status(200).send('Image uploaded successfully');
						} else {
							throw Error(
								'Failed to upload image to google drive (it is only uploaded to the server)'
							);
						}
					});
				} else {
					throw Error('Image with this name already exist');
				}
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

				let fileIdToDelete = '';
				(await GoogleDriveManager.listFiles()).forEach((element: any) => {
					if ((element.name = imageName)) {
						fileIdToDelete = element.id;
					}
				});
				if (fileIdToDelete != '') {
					if (
						(await GoogleDriveManager.deleteFile(fileIdToDelete)) == 'Success'
					)
						res.status(200).send('Image deleted successfully');
				}
			} else {
				throw new Error('Image not found');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
	private listAllFiles = async (req: Request, res: Response) => {
		try {
			res.status(200).send(fs.readdirSync('./src/images/'));
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
}
