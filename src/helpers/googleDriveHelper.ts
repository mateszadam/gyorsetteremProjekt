import { Auth } from 'googleapis';
import { AuthPlus } from 'googleapis/build/src/googleapis';

const fs = require('fs');
const readline = require('readline');
import apikeys from '../ivory-granite-394511-e2070349e429.json';
const { google } = require('googleapis');

//https://dev.to/mearjuntripathi/upload-files-on-drive-with-nodejs-15j2
class GoogleDriveManager {
	private static SCOPES = ['https://www.googleapis.com/auth/drive'];

	public static authClient: any;
	public static bearerToken: any;
	static async authorize() {
		const auth = new google.auth.JWT(
			apikeys.client_email,
			null,
			apikeys.private_key,
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
	static async listFiles(auth: any) {
		const drive = google.drive({ version: 'v3', auth });

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
	static async uploadFile(filePath: string, folderId: string) {
		const drive = google.drive({ version: 'v3', auth: this.authClient });

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
		} catch (error: any) {
			throw Error(`Error updating file in Google Drive: ${error.message}`);
		}
	}
}

export default GoogleDriveManager;
