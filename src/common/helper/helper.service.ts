import { Injectable } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class HelperService {
  titleCase(str: string): string {
    return str
      .toLowerCase()
      .split(' ')
      .map(function (word) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }

  async downloadAndSaveImage(
    imageUrl: string | undefined,
    folder: string,
    filename: string,
  ): Promise<string> {
    try {
      if (imageUrl == undefined) {
        return '';
      }

      // Create public folder if it doesn't exist
      const publicFolder = path.join(
        process.cwd(),
        'public',
        `images/${folder}`,
      );
      if (!fs.existsSync(publicFolder)) {
        fs.mkdirSync(publicFolder, { recursive: true });
      }

      // Download the image
      const response: AxiosResponse<ArrayBuffer> = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
      });

      // Save to file
      const filePath = path.join(publicFolder, filename);
      fs.writeFileSync(filePath, Buffer.from(response.data));

      // Return the public URL path
      return `/images/${folder}/${filename}`;
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.log(imageUrl);
        throw new Error(`Failed to download and save image: ${error.message}`);
      }
      throw new Error(
        'Failed to download and save image: Unknown error occurred',
      );
    }
  }
}
