const GITHUB_API = 'https://api.github.com';
const OWNER = 'kepello';
const REPO = 'music';
const BRANCH = 'main';

// Optional: Add your GitHub Personal Access Token here for higher rate limits
// WARNING: This will be visible in the frontend code. Only use tokens with minimal permissions.
// Generate one at: https://github.com/settings/tokens (no scopes needed for public repos)
const GITHUB_TOKEN = ''; // Leave empty for unauthenticated requests (60/hour limit)

// Cache disabled for immediate repository updates
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 0; // Disabled - always fetch fresh data

// Persistent cache in localStorage disabled
const STORAGE_KEY_PREFIX = 'github_cache_';
const STORAGE_DURATION = 0; // Disabled

function getCached<T>(key: string): T | null {
  // Cache disabled - always return null to fetch fresh data
  return null;
}

function setCache(key: string, data: any): void {
  // Cache disabled - don't store anything
}

export interface GitHubContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: 'file' | 'dir';
}

// Catalog types - Simplified structure: Library → Collections (Albums) → Tracks
// Where a song can be heard off-site. Keys are only present when filled in.
export interface StreamingLinks {
  spotify?: string;
  appleMusic?: string;
  amazonMusic?: string;
}

export interface CatalogTrack {
  name: string;
  title?: string;   // Friendly display name
  trackNumber?: number;  // Sequential ordering
  path: string;
  readme?: string;  // Full markdown content
  mp3?: string;     // Full URL to GitHub Releases
  m4a?: string;     // Full URL to GitHub Releases
  playlist?: string; // Relative path to file
  lyrics?: string | null;  // Full text content (not path)
  streaming?: StreamingLinks;
}

// Collections are albums - they are the same thing
export interface CatalogCollection {
  name: string;
  title?: string;   // Display title from ALBUM.json, falls back to name
  artist?: string;  // Releasing artist name (Carl releases under more than one)
  path: string;
  readme?: string;
  cover?: string;  // Cover image (any reasonable size)
  released?: string;  // Release date from ALBUM.json
  streaming?: StreamingLinks;
  playlistMP3?: string;  // Relative path to MP3 playlist
  playlistM4A?: string;  // Relative path to M4A playlist
  tracks: CatalogTrack[];
}

export interface Catalog {
  version: string;
  generatedAt: string;
  repository: {
    owner: string;
    repo: string;
    branch: string;
  };
  cover?: string;  // Library cover image (800x800)
  readme?: string; // Library readme
  collections: CatalogCollection[];  // Collections are the albums
}

// Alias for clarity - collections and albums are the same
export type CatalogAlbum = CatalogCollection;

export async function getRepoContents(path: string = ''): Promise<GitHubContent[]> {
  // Check cache first
  const cacheKey = `contents:${path}`;
  const cached = getCached<GitHubContent[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const url = `${GITHUB_API}/repos/${OWNER}/${REPO}/contents/${path}`;
  
  try {
    const headers: HeadersInit = {};
    if (GITHUB_TOKEN) {
      headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    }

    const response = await fetch(url, {
      headers,
      cache: 'default'
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('GitHub API error details:', {
        status: response.status,
        statusText: response.statusText,
        data: errorData
      });
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const result = Array.isArray(data) ? data : [data];
    
    // Cache the result
    setCache(cacheKey, result);
    
    return result;
  } catch (error) {
    console.error('Error fetching repo contents:', error);
    return [];
  }
}

export async function getFileContent(path: string): Promise<string> {
  // Check cache first
  const cacheKey = `file:${path}`;
  const cached = getCached<string>(cacheKey);
  if (cached) {
    return cached;
  }

  // Use raw.githubusercontent.com directly to avoid API rate limits
  // Add timestamp to prevent stale cached content
  const timestamp = Date.now();
  const rawUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${path}?t=${timestamp}`;
  
  try {
    const response = await fetch(rawUrl, {
      cache: 'no-cache'
    });
    
    if (!response.ok) {
      console.error('Error fetching raw file:', {
        status: response.status,
        statusText: response.statusText,
        path
      });
      return '';
    }
    
    const content = await response.text();
    
    // Cache the result
    setCache(cacheKey, content);
    
    return content;
  } catch (error) {
    console.error('Error fetching file content:', error);
    return '';
  }
}

/**
 * Construct URL for files in git repository (not releases)
 * Use for: WAV files, playlists, cover images
 * DO NOT use for: MP3/M4A files (already full URLs), album ZIPs (already full URLs)
 */
export function getRawFileUrl(path: string): string {
  // Add timestamp as cache buster to force fresh image loads
  const timestamp = Date.now();
  return `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${path}?t=${timestamp}`;
}

/**
 * Construct URL for files in git repository using catalog repository info
 * Use for: WAV files, playlists, cover images
 */
export function constructGitUrl(relativePath: string, catalog: Catalog): string {
  const { owner, repo, branch } = catalog.repository;
  const timestamp = Date.now();
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${relativePath}?t=${timestamp}`;
}

// Cache for the catalog data
let catalogCache: Catalog | null = null;
let catalogCacheTime: number = 0;
const CATALOG_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getCatalog(forceRefresh: boolean = false): Promise<Catalog | null> {
  // Check if we have a valid cached catalog
  if (!forceRefresh && catalogCache && Date.now() - catalogCacheTime < CATALOG_CACHE_DURATION) {
    return catalogCache;
  }

  try {
    const catalogUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/catalog.json`;
    const response = await fetch(catalogUrl, {
      cache: 'no-cache'
    });

    if (!response.ok) {
      console.warn('catalog.json not found or error fetching it:', response.status);
      return null;
    }

    const catalog: Catalog = await response.json();
    
    // Cache the catalog
    catalogCache = catalog;
    catalogCacheTime = Date.now();
    
    console.log('Catalog loaded successfully:', {
      version: catalog.version,
      generatedAt: catalog.generatedAt,
      collectionsCount: catalog.collections.length
    });
    
    return catalog;
  } catch (error) {
    console.error('Error fetching catalog:', error);
    return null;
  }
}