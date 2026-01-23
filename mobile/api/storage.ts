import { storage } from '@/config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as Crypto from 'expo-crypto';

export const uploadImage = async (uri: string, path: string = 'food-posts'): Promise<string> => {
  let blob: Blob | null = null;

  try {
    // 1. Fetch the file from the local URI
    const response = await fetch(uri);
    blob = await response.blob();

    // 2. Create a reference in Firebase Storage
    const uuid = Crypto.randomUUID();
    const filename = `${uuid}.jpg`;
    const storagePath = `${path}/${filename}`;
    
    const storageRef = ref(storage, storagePath);

    // 3. Upload the blob
    // metadata is optional but good practice
    const metadata = {
      contentType: 'image/jpeg',
    };

    await uploadBytes(storageRef, blob, metadata);

    // 4. Get the download URL
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;

  } catch (error: any) {
    console.error("Firebase Storage Upload Error:", error);
    
    // Log specific Firebase error codes for easier debugging
    if (error.code === 'storage/unauthorized') {
      console.error("Permission denied. Check your Firebase Storage Rules.");
    } else if (error.code === 'storage/canceled') {
      console.error("Upload canceled.");
    } else if (error.code === 'storage/unknown') {
      console.error("Unknown error occurred, inspect the server response.");
    }

    throw new Error(`Failed to upload image: ${error.message}`);
  } finally {
    // 5. Clean up the blob to free memory
    if (blob) {
      // @ts-ignore - close() exists in React Native's implementation of Blob
      blob.close && blob.close(); 
    }
  }
};
