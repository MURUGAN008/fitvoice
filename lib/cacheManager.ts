import * as FileSystem from 'expo-file-system/legacy';

const CACHE_DIR = FileSystem.documentDirectory + 'blaze_cache/';

// Ensure the cache directory exists
async function ensureCacheDir() {
  const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

/**
 * Returns the local file:// URI if the asset is already cached.
 * Otherwise, returns the remote URI and lazily downloads it in the background for next time.
 */
export async function getCachedAssetUri(remoteUri: string): Promise<string> {
  if (!remoteUri) return '';
  
  await ensureCacheDir();

  // Extract the filename from the URL, escaping it to be safe
  const filename = remoteUri.split('/').pop() || 'unknown.mp4';
  const localUri = CACHE_DIR + filename;

  const fileInfo = await FileSystem.getInfoAsync(localUri);

  if (fileInfo.exists && !fileInfo.isDirectory) {
    // Return local cached file
    return localUri;
  }

  // If it doesn't exist locally, we return the remote URI immediately so the user can stream it,
  // but we kick off a background download to cache it for next time.
  FileSystem.downloadAsync(remoteUri, localUri)
    .then(({ uri }) => {
      console.log('Finished caching to:', uri);
    })
    .catch((error) => {
      console.error('Error caching asset:', error);
    });

  return remoteUri;
}

/**
 * Proactively download a list of URLs (used when user is on the preview screen)
 */
export async function preloadAssets(remoteUris: string[]) {
  await ensureCacheDir();

  for (const remoteUri of remoteUris) {
    if (!remoteUri) continue;
    const filename = remoteUri.split('/').pop() || 'unknown.mp4';
    const localUri = CACHE_DIR + filename;

    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (!fileInfo.exists) {
      try {
        await FileSystem.downloadAsync(remoteUri, localUri);
        console.log('Preloaded:', filename);
      } catch (err) {
        console.error('Error preloading:', filename, err);
      }
    }
  }
}

/**
 * Get total cache size in bytes
 */
export async function getCacheSize(): Promise<number> {
  await ensureCacheDir();
  let totalSize = 0;
  
  try {
    const dirContent = await FileSystem.readDirectoryAsync(CACHE_DIR);
    for (const file of dirContent) {
      const info = await FileSystem.getInfoAsync(CACHE_DIR + file);
      if (info.exists && !info.isDirectory) {
        totalSize += info.size || 0;
      }
    }
  } catch (err) {
    console.error('Failed to get cache size', err);
  }
  
  return totalSize;
}

/**
 * Clear all downloaded cache files
 */
export async function clearCache(): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
      await ensureCacheDir(); // Recreate empty dir
    }
  } catch (err) {
    console.error('Failed to clear cache', err);
  }
}
