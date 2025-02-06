import fs from 'fs';
import { Router, Request, Response } from 'express';
import { defaultAnswers } from './statusCodeHelper';
import { UploadedFile } from 'express-fileupload';
import GoogleDriveManager from './googleDriveHelper';

class fileHandler {
	public static listDictionary(path: string, res: Response) {
		try {
			res.status(200).send(fs.readdirSync(path));
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	}
	public static getImageByName(imagePath: string, res: Response) {
		try {
			var mime = {
				jpg: 'image/jpeg',
				png: 'image/png',
				svg: 'image/svg+xml',
			};
			if (imagePath) {
				if (fs.existsSync(imagePath)) {
					const ext = imagePath.split('.')[1] as 'jpg' | 'png' | 'svg';
					res.writeHead(200, {
						'Content-Type': mime[ext] || 'text/plain',
					});
					fs.createReadStream(imagePath).pipe(res);
				} else {
					throw Error('Image not fount with the name');
				}
			} else {
				throw Error('Image name not found in request');
			}
		} catch (error: any) {
			defaultAnswers.badRequest(res, error.message);
		}
	}
	public static async saveImage(
		image: UploadedFile,
		uploadPath: string,
		res: Response
	) {
		image.name = Buffer.from(image.name, 'ascii').toString('utf-8');
		const imagePath = uploadPath + image.name;
		if (!fs.existsSync(imagePath)) {
			await image.mv(imagePath, async (err: any) => {
				if (err) {
					return defaultAnswers.badRequest(res, err.message);
				}
				const message = await GoogleDriveManager.uploadFile(imagePath);
				if (message) {
					res.status(200).send('Image uploaded successfully');
				} else {
					throw Error(
						'Failed to upload image to google drive (it is only uploaded to the server)'
					);
				}
			});
		}
	}
}

export default fileHandler;
