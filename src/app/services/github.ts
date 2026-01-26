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

export function getRawFileUrl(path: string): string {
  // Add timestamp as cache buster to force fresh image loads
  const timestamp = Date.now();
  return `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${path}?t=${timestamp}`;
}