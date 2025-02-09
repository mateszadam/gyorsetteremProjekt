import { Router, Request, Response } from 'express';
import fileUpload, { UploadedFile } from 'express-fileupload';
import { IController } from '../models/models';
import fs from 'fs';

import { authAdminToken, authToken } from '../services/tokenService';
import { defaultAnswers } from '../helpers/statusCodeHelper';
import GoogleDriveManager from '../helpers/googleDriveHelper';
import fileHandler from '../helpers/fileHandlingHelper';
export default class imagesController implements IController {
	public router = Router();
	public endPoint = '/images';

	constructor() {
		this.router.use(fileUpload());

		this.router.get('/name/:imageName', authToken, this.getImage);
		this.router.get('/all', authToken, this.listAllFiles);

		// this.router.delete('/:imageName', authToken, this.deleteImage);

		this.router.post('/', authAdminToken, this.uploadImage);
		this.router.get('/profile', authToken, this.listAllProfilePictures);
		this.router.get('/profile/:name', authToken, this.getProfiePictureByName);
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
