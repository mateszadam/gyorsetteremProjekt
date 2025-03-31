import fs from 'fs';
import { Router, Request, Response } from 'express';
import defaultAnswers from './statusCodeHelper';
import { UploadedFile } from 'express-fileupload';
import GoogleDriveManager from './googleDriveHelper';
import { languageBasedMessage } from './tools';
import { log } from 'console';

export default class fileHandler {
	public static listDictionary(path: string, req: Request, res: Response) {
		try {
			res.status(200).send(fs.readdirSync(path));
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
			);
		}
	}
	public static getImageByName(imagePath: string, req: Request, res: Response) {
		try {
			var mime = {
				jpg: 'image/jpeg',
				png: 'image/png',
				svg: 'image/svg+xml',
			};
			if (imagePath) {
				if (fs.existsSync(imagePath)) {
					const ext = imagePath.split('.')[2] as 'jpg' | 'png' | 'svg';
					res.writeHead(200, {
						'Content-Type': mime[ext] || 'text/plain',
					});
					fs.createReadStream(imagePath).pipe(res);
				} else {
					throw Error('48');
				}
			} else {
				throw Error('08');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(
				res,
				languageBasedMessage.getError(req, error.message)
			);
		}
	}
	public static async saveImage(
		image: UploadedFile,
		uploadPath: string,
		req: Request,
		res: Response
	) {
		image.name = Buffer.from(image.name, 'ascii').toString('utf-8');
		const imagePath = uploadPath + image.name;
		if (!fs.existsSync(imagePath)) {
			await image.mv(imagePath, async (err: any) => {
				if (err) {
					defaultAnswers.badRequest(
						res,
						languageBasedMessage.getError(req, err)
					);
				}
				const message = await GoogleDriveManager.uploadFile(imagePath);
				if (message) {
					res.status(200).send('59');
				} else {
					throw Error('57');
				}
			});
		} else {
			throw Error('58');
		}
	}
}
