const fs = require('fs');

import { log } from 'console';
const { google } = require('googleapis');
require('dotenv').config();

export default class GoogleDriveManager {
	private static SCOPES = ['https://www.googleapis.com/auth/drive'];
	public static authClient: any;
	public static bearerToken: any;
	static async authorize() {
		const CLIENT_EMAIL: string = process.env.CLIENT_EMAIL || '';
		const PRIVATE_KEY: string = process.env.PRIVATE_KEY || '';
		const auth = new google.auth.JWT(
			CLIENT_EMAIL,
			null,
			PRIVATE_KEY.split(String.raw`\n`).join('\n'),
			this.SCOPES
		);

		try {
			await auth.authorize();
			this.bearerToken = auth.credentials.access_token;
			this.authClient = auth;
		} catch (error: any) {
			throw new Error(`Error authorizing Google Drive API: ${error.message}`);
		}
	}
	static async listFiles() {
		const drive = google.drive({ version: 'v3', auth: this.authClient });

		try {
			const response = await drive.files.list({
				pageSize: 10,
				fields: 'nextPageToken, files(id, name)',
			});

			const files = response.data.files;
			if (files.length) {
				return files;
			} else {
				throw Error('No files found.');
			}
		} catch (error: any) {
			throw Error(`Error listing files in Google Drive: ${error.message}`);
		}
	}
	static async uploadFile(filePath: string) {
		const drive = google.drive({ version: 'v3', auth: this.authClient });

		const folderId = '1fGZ42ZFdgGLBCKMcKuIRwk3hFXIgbEPm';
		const fileMetadata = {
			name: filePath.split('/').pop(), // Extract file name from path
			parents: [folderId], // Folder ID to upload the file into
		};

		const media = {
			mimeType: 'application/octet-stream',
			body: fs.createReadStream(filePath), // Readable stream for file upload
		};

		try {
			const response = await drive.files.create({
				resource: fileMetadata,
				media: media,
				fields: 'id',
			});

			console.log('File uploaded successfully. File ID:', response.data.id);
			return response.data;
		} catch (error: any) {
			throw Error(`Error uploading file to Google Drive: ${error.message}`);
		}
	}
	static async deleteFile(fileId: string) {
		const drive = google.drive({ version: 'v3', auth: this.authClient });

		try {
			await drive.files.delete({
				fileId: fileId,
			});

			console.log('File deleted successfully.');
			return 'Success';
		} catch (error: any) {
			throw Error(`Error deleting file from Google Drive: ${error.message}`);
		}
	}
	static async getFile(fileId: string) {
		const drive = google.drive({ version: 'v3', auth: this.authClient });
		const response = await drive.files.get(
			{ fileId, alt: 'media' },
			{ responseType: 'stream' }
		);
		try {
			if (response) {
				return response;
			}
		} catch (error: any) {
			throw Error(`Error deleting file from Google Drive: ${error.message}`);
		}
	}
	// Function to update a file in Google Drive
	static async updateFile(fileId: string, filePath: string) {
		const drive = google.drive({ version: 'v3', auth: this.authClient });

		const fileMetadata = {
			name: filePath.split('/').pop(), // Extract file name from path
		};

		const media = {
			mimeType: 'application/octet-stream',
			body: fs.createReadStream(filePath), // Readable stream for file update
		};

		try {
			const response = await drive.files.update({
				fileId: fileId,
				resource: fileMetadata,
				media: media,
			});
			console.log('File updated successfully.');
			return response;
		} catch (error: any) {
			throw Error(`Error updating file in Google Drive: ${error.message}`);
		}
	}
	static async init() {
		await this.authorize();
		const files = await this.listFiles();
		this.AuthEveryDay();
		files.forEach((element: any) => {
			if (element.name != 'project') {
				var url = `https://www.googleapis.com/drive/v3/files/${element.id}?alt=media`;
				var bearer = 'Bearer ' + GoogleDriveManager.bearerToken;
				log(url);
				fetch(url, {
					method: 'GET',
					credentials: 'include',
					headers: {
						Authorization: bearer,
					},
				})
					.then(async (response) => {
						const buffer = await response.arrayBuffer();
						const a = Buffer.from(buffer);
						if (!a) {
							throw Error('Error in file handling');
						}
						if (!fs.existsSync('./src/images/other')) {
							fs.mkdirSync('./src/images/other');
						}
						const uploadPath = './src/images/other/' + element.name;

						fs.writeFile(uploadPath, a, (err: any) => {
							if (err) {
								throw Error('Error writing file: ' + err.message);
							}
						});
					})

					.catch((error) => {
						console.error('Something bad happened', error);
					});
			}
		});
		log('Google drive sync successful');
	}
	static async AuthEveryDay() {
		var now = new Date();
		var night = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate() + 1, // the next day, ...
			0,
			0,
			0 // ...at 00:00:00 hours
		);
		var msToMidnight = night.getTime() - now.getTime();

		setTimeout(async function () {
			await GoogleDriveManager.authorize();
			console.log('New auth run.');
			GoogleDriveManager.AuthEveryDay();
		}, msToMidnight);
	}
}
