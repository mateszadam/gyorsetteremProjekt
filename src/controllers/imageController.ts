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
import fileHandler from '../helpers/fileHandlingHelper';
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
		 *     summary: List all images
		 *     tags: [Images]
		 *     responses:
		 *       200:
		 *         description: A list of all images
		 *       400:
		 *         description: Bad request
		 * /images/profile:
		 *   get:
		 *     summary: List all profile pictures
		 *     tags: [Images]
		 *     responses:
		 *       200:
		 *         description: A list of all profile pictures
		 *       400:
		 *         description: Bad request
		 * /images/profile/{name}:
		 *   post:
		 *     summary: Get profile picture by name
		 *     tags: [Images]
		 *     parameters:
		 *       - in: path
		 *         name: name
		 *         required: true
		 *         schema:
		 *           type: string
		 *         description: The name of the profile picture to retrieve
		 *     responses:
		 *       200:
		 *         description: A profile picture file.
		 *         content:
		 *           image/svg+xml:
		 *             schema:
		 *               type: string
		 *               format: binary
		 *       400:
		 *         description: Bad request
		 */

		this.router.get('/name/:imageName', authenticateToken, this.getImage);
		this.router.get('/all', authenticateToken, this.listAllFiles);

		// this.router.delete('/:imageName', authenticateToken, this.deleteImage);

		this.router.post('/', authenticateAdminToken, this.uploadImage);
		this.router.get('/profile', this.listAllProfilePictures);
		this.router.post('/profile/:name', this.getProfiePictureByName);
	}
	// User képeknek??????
	// https://www.svgrepo.com/collection/emoji-face-emoji-vectors/

	private getImage = async (req: Request, res: Response) => {
		try {
			const image = req.params.imageName;
			if (image) {
				fileHandler.getImageByName(`./src/images/other/${image}`, res);
			} else {
				throw Error('No image name found');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};

	private getProfiePictureByName = async (req: Request, res: Response) => {
		try {
			const image = req.params.name;
			console.log(image);
			if (image) {
				fileHandler.getImageByName(
					`./src/images/profilePictures/${image}`,
					res
				);
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
				await fileHandler.saveImage(image, './src/images/other/', res);
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
			const imagePath = `./src/images/other/${imageName}`;

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
			fileHandler.listDictionary('./src/images/other/', res);
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
	private listAllProfilePictures = async (req: Request, res: Response) => {
		try {
			fileHandler.listDictionary('./src/images/profilePictures/', res);
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	};
}
