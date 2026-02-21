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
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        },
        timeout: 10000,
      });

      // Validate response is an image
      const contentType = response.headers['content-type'];
      if (!contentType?.startsWith('image/')) {
        console.warn(`Skipping invalid image (${contentType}): ${imageUrl}`);
        return '';
      }

      // Save to file
      const filePath = path.join(publicFolder, filename);
      fs.writeFileSync(filePath, Buffer.from(response.data));

      // Return the public URL path
      return `/images/${folder}/${filename}`;
    } catch (error: unknown) {
      console.warn(`Failed to download image: ${imageUrl}`, error);
      return '';
    }
  }
}
