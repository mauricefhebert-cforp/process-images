#!/usr/bin/env node

import officeParser from 'officeparser';
import { argv } from 'node:process';
import open from 'open';
import path from 'node:path';
import os from 'node:os';
import * as fs from 'node:fs/promises';
import tinify from 'tinify';
import sharp from 'sharp';
import dotenv from 'dotenv';

dotenv.config(); // Load environement variable from dotenv file

const defaultFolderLocation = path.join(os.homedir(), 'Downloads');  // Default folder location
const document = argv[2];  // Document path
const imageFolders = argv[3] || defaultFolderLocation;  // Folder to move images to (default is Downloads)

tinify.key = process.env.TINIFY_API_KEY;

if (!document || !document.match(/\.docx$/i)) {
  console.error("No document provided or unsupported file type. Please use a .docx file.");
  process.exit(1);
}

const parseDocument = async (document) => {
  return new Promise((resolve, reject) => {
    officeParser.parseOffice(document, (data, err) => {
      if (err) {
        reject(new Error(`Error parsing document: ${err}`));
      } else {
        resolve(data);
      }
    });
  });
};

const openInBatches = async (urls, batchSize = 4, delay = 15000) => {
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    console.log(`Opening batch of ${batch.length} URLs:`);

    for (const url of batch) {
      console.log(`Opening: ${url}`);
      await open(url);
    }

    if (i + batchSize < urls.length) {
      console.log(`Waiting for ${delay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

const checkIfFileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;  // File exists
  } catch (err) {
    return false;  // File does not exist
  }
};

const moveAndRenameImages = async (images, maxRetries = 3, retryDelay = 5000) => {
  // Ensure the target folder exists if a 3rd argument (folder) is provided
  await fs.mkdir(imageFolders, { recursive: true });

  for (const image of images) {
    const originalFileName = `AdobeStock_${image}.jpeg`;  // The original downloaded name
    const newFileName = `${image}.jpeg`;  // Renamed without the AdobeStock_ prefix
    const oldPath = path.join(defaultFolderLocation, originalFileName);  // Where the image is downloaded
    const newPath = path.join(imageFolders, newFileName);  // New path for the renamed image

    let attempt = 0;
    let success = false;

    // Retry loop for moving and renaming images
    while (attempt < maxRetries && !success) {
      if (await checkIfFileExists(oldPath)) {
        try {
          // Move and rename the image
          await fs.rename(oldPath, newPath);
          console.log(`Moved and renamed ${originalFileName} to ${newFileName}`);
          success = true;
        } catch (err) {
          console.error(`Error moving ${originalFileName}:`, err);
          attempt++;
          if (attempt < maxRetries) {
            console.log(`Retrying in ${retryDelay / 1000} seconds... (Attempt ${attempt + 1})`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));  // Wait before retry
          } else {
            console.error(`Failed to move ${originalFileName} after ${maxRetries} attempts.`);
          }
        }
      } else {
        attempt++;
        console.log(`File ${originalFileName} does not exist. Retrying in ${retryDelay / 1000} seconds... (Attempt ${attempt + 1})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));  // Wait before retry
      }
    }
  }
};

const cropImageTo16x9 = async (imagePath, maxRetries = 3, retryDelay = 5000) => {
  let attempt = 0;
  let success = false;

  while (attempt < maxRetries && !success) {
    try {
      // Check if the image exists
      if (await checkIfFileExists(imagePath)) {
        const image = sharp(imagePath);
        const metadata = await image.metadata();

        // Calculate crop dimensions for 16:9 aspect ratio
        const aspectRatio = 16 / 9;
        let width = metadata.width;
        let height = metadata.height;

        let outputFilePath = imagePath.replace('.jpeg', '_cropped.jpeg'); // Temporary output file

        if (width / height > aspectRatio) {
          // Crop width
          const newWidth = Math.floor(height * aspectRatio);
          const left = Math.floor((width - newWidth) / 2);
          await image.extract({ left, top: 0, width: newWidth, height }).toFile(outputFilePath);
          console.log(`Cropped ${imagePath} to 16:9 aspect ratio (width-based crop).`);
        } else {
          // Crop height
          const newHeight = Math.floor(width / aspectRatio);
          const top = Math.floor((height - newHeight) / 2);
          await image.extract({ left: 0, top, width, height: newHeight }).toFile(outputFilePath);
          console.log(`Cropped ${imagePath} to 16:9 aspect ratio (height-based crop).`);
        }

        // After cropping, replace the original file with the cropped one
        await fs.rename(outputFilePath, imagePath);
        console.log(`Replaced original image with cropped image: ${imagePath}`);
        success = true; // Mark as successful if cropping and renaming succeed
      } else {
        attempt++;
        console.log(`File ${imagePath} does not exist. Retrying in ${retryDelay / 1000} seconds... (Attempt ${attempt + 1})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));  // Wait before retry
      }
    } catch (err) {
      attempt++;
      console.error(`Error cropping image ${imagePath}:`, err);
      if (attempt < maxRetries) {
        console.log(`Retrying crop operation in ${retryDelay / 1000} seconds... (Attempt ${attempt + 1})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));  // Wait before retry
      } else {
        console.error(`Failed to crop image ${imagePath} after ${maxRetries} attempts.`);
      }
    }
  }
};

const tinifyImages = async (images, maxRetries = 3, retryDelay = 5000) => {
  for (const image of images) {
    const fileName = `AdobeStock_${image}.jpeg`;  // Renamed image
    const fileLocation = path.join(defaultFolderLocation, fileName);

    let attempt = 0;
    let success = false;

    // Retry loop for checking the existence of the file and compressing it
    while (attempt < maxRetries && !success) {
      if (await checkIfFileExists(fileLocation)) {
        try {
          await tinify.fromFile(fileLocation).toFile(fileLocation);  // Compress the image
          console.log(`Compressed ${fileName}`);
          success = true;  // Mark as successful if no error occurs
        } catch (err) {
          console.error(`Error compressing ${fileName}:`, err);
          attempt++;
          if (attempt < maxRetries) {
            console.log(`Retrying compression in ${retryDelay / 1000} seconds... (Attempt ${attempt + 1})`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));  // Wait before retry
          } else {
            console.error(`Failed to compress ${fileName} after ${maxRetries} attempts.`);
          }
        }
      } else {
        attempt++;
        console.log(`File ${fileName} does not exist. Retrying in ${retryDelay / 1000} seconds... (Attempt ${attempt + 1})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));  // Wait before retry
      }
    }
  }
};


const run = async () => {
  try {
    const data = await parseDocument(document);

    // Use regex to find numbers between 7 and 10 digits (image IDs)
    const regex = /\d{7,10}/gm;
    const images = (data.match(regex) || []).sort((p, n) => p - n);

    if (images.length === 0) {
      console.log("No image IDs found in the document.");
      return;
    }

    // Create the URLs for Adobe Stock pages
    const urls = images.map(image => `https://stock.adobe.com/ca/${image}`);

    // Open the URLs in batches of 1, with a 10-second delay between batches
    await openInBatches(urls, 1, 10000);

    // Compress images with retry logic and crop them to 16:9
    await tinifyImages(images);

    // Rename and move images to the specified folder (or Downloads if no folder is specified)
    await moveAndRenameImages(images);
  } catch (err) {
    console.error(err.message);
  }
};

run();

