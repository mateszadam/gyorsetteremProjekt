import { Router, Request, Response } from 'express';
import fileUpload, { UploadedFile } from 'express-fileupload';
import { IController } from '../models/models';
import fs from 'fs';

import { authAdminToken, authToken } from '../services/tokenService';
import defaultAnswers from '../helpers/statusCodeHelper';
import GoogleDriveManager from '../helpers/googleDriveHelper';
import fileHandler from '../helpers/fileHandlingHelper';
import { languageBasedMessage } from '../helpers/tools';

export default class imagesController implements IController {
	public router = Router();
	public endPoint = '/images';

	constructor() {
		this.router.use(fileUpload());

		this.router.get('/name/:imageName', this.getImage);
		this.router.get('/all', this.listAllFiles);

		this.router.post('/', authAdminToken, this.uploadImage);
		this.router.get('/profile', authToken, this.listAllProfilePictures);
		this.router.get('/profile/:name', this.getProfiePictureByName);
	}
	// User képeknek??????
	// https://www.svgrepo.com/collection/emoji-face-emoji-vectors/

	private getImage = async (req: Request, res: Response) => {
		try {
			const image = req.params.imageName;
			if (image) {
				fileHandler.getImageByName(`./src/images/other/${image}`, req, res);
			} else {
				throw Error('47');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
			);
		}
	};

	private getProfiePictureByName = async (req: Request, res: Response) => {
		try {
			const image = req.params.name;
			if (image) {
				fileHandler.getImageByName(
					`./src/images/profilePictures/${image}`,
					req,
					res
				);
			} else {
				throw Error('48');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
			);
		}
	};

	// https://drive.google.com/drive/u/1/folders/1fGZ42ZFdgGLBCKMcKuIRwk3hFXIgbEPm
	private uploadImage = async (req: Request, res: Response) => {
		try {
			if (req.files && Object.keys(req.files).length > 0) {
				const image = req.files.image as UploadedFile;
				await fileHandler.saveImage(image, './src/images/other/', req, res);
			} else {
				throw new Error('46');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
			);
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
						res.status(200).send(languageBasedMessage.getError(req, '47'));
				}
			} else {
				throw new Error('48');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
			);
		}
	};
	private listAllFiles = async (req: Request, res: Response) => {
		try {
			fileHandler.listDictionary('./src/images/other/', req, res);
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
			);
		}
	};
	private listAllProfilePictures = async (req: Request, res: Response) => {
		try {
			fileHandler.listDictionary('./src/images/profilePictures/', req, res);
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
			);
		}
	};
}
