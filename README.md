# Music Player

A static web application that displays and plays music files from the [kepello/music](https://github.com/kepello/music) GitHub repository.

## Features

- 🎵 Browse music organized by collections, albums, and tracks
- 🎨 Display cover artwork and README descriptions
- 🎧 Persistent audio player that continues playing while navigating
- 📄 Render markdown README files for each level
- 💾 Download individual songs or albums as playlists
- 🌐 Fully static - hosted on GitHub Pages

## Music Repository Structure

The app expects the following structure in the `kepello/music` repository:

```
music/
├── README.md (root description)
├── COVER.jpg (root cover art)
├── Collection1/
│   ├── README.md
│   ├── COVER.jpg
│   ├── Album1/
│   │   ├── README.md
│   │   ├── COVER.jpg
│   │   └── Track1/
│   │       ├── track.mp3
│   │       └── LYRICS.txt
```

## Local Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build
```

## Deployment

This app is automatically deployed to GitHub Pages when changes are pushed to the `main` branch.

### Live Site

🎵 **[View the Music Player](https://kepello.github.io/Musicplayer/)**

### Repository

📦 **[GitHub Repository](https://github.com/kepello/Musicplayer)**

### Setup Instructions

1. **Create a new repository** (e.g., `kepello/Musicplayer`)

2. **Push this code to the repository**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/kepello/Musicplayer.git
   git push -u origin main
   ```

3. **Enable GitHub Pages**:
   - Go to your repository settings
   - Navigate to "Pages" section
   - Under "Source", select "GitHub Actions"
   - The workflow will automatically deploy your site

4. **Access your site**:
   - Your site will be available at: `https://kepello.github.io/Musicplayer/`
   - If using a different repo name, update the `base` in `vite.config.ts`

## GitHub API Rate Limits

The app uses the GitHub API to fetch music content. **Unauthenticated requests are limited to 60 per hour per IP address.**

### To Avoid Rate Limiting (Recommended for Production):

**Option 1: Add a Personal Access Token (Simple)**

1. Generate a Personal Access Token at https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Give it a descriptive name like "Music Player"
   - **No scopes/permissions needed** for public repositories
   - Click "Generate token" and copy it

2. Add the token to `/src/app/services/github.ts`:
   ```typescript
   const GITHUB_TOKEN = 'ghp_your_token_here';
   ```
   
3. Rebuild and redeploy:
   ```bash
   pnpm build
   git add .
   git commit -m "Add GitHub token"
   git push
   ```

⚠️ **Security Note**: This token will be visible in the frontend code. This is acceptable for:
- Public repositories (no sensitive data)
- Tokens with no special permissions
- Personal projects

**Never** commit tokens with write access or private repo access.

**Option 2: Use GitHub Actions Secrets (More Secure)**

For better security, you can inject the token during the build process:

1. Add your token as a repository secret:
   - Go to your repo Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `VITE_GITHUB_TOKEN`
   - Value: Your token

2. Update `.github/workflows/deploy.yml`:
   ```yaml
   - name: Build
     env:
       VITE_GITHUB_TOKEN: ${{ secrets.VITE_GITHUB_TOKEN }}
     run: pnpm build
   ```

3. Update `/src/app/services/github.ts`:
   ```typescript
   const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN || '';
   ```

### Current Caching Strategy

The app uses aggressive caching to minimize API calls:
- **In-memory cache**: 10 minutes
- **localStorage cache**: 1 hour (persists across page reloads)
- File content uses `raw.githubusercontent.com` (doesn't count against API limits)

## Technologies

- React 18
- React Router (Data mode)
- Vite
- Tailwind CSS v4
- TypeScript
- Lucide React (icons)
- React Markdown

## License

MIT