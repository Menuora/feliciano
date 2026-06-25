# Feliciano Hotel & Restaurant Template

Serverless, static-hosted restaurant and hotel website template with a professional `/admin` dashboard for bookings, Cloudinary image uploads, website settings, and homepage image customization.

## Local Setup

1. Copy the environment configuration template:
   ```bash
   copy js/env.example.js js/env.js
   ```

2. Fill in the credentials inside `js/env.js`. If you leave it empty or configure placeholders, the template will automatically fall back to **LocalStorage Mode** (so you can run and test everything completely locally with zero setup!).
   - **Firebase Configuration:** Set up a free Firebase project, enable Firestore and Email/Password Auth, and insert your app credentials.
   - **Cloudinary Configuration:** Add your Cloudinary `cloudName` and create an unsigned `uploadPreset` to enable client-side image uploads.

3. Run locally:
   ```bash
   npm run dev
   ```

4. Open:
   - Website: `http://localhost:3000`
   - Admin: `http://localhost:3000/admin.html` (or `http://localhost:3000/admin` depending on server rewrites)

## Deployment

Since the template has no server-side Node.js code, it can be hosted on any static hosting provider (e.g., GitHub Pages, Vercel, Netlify, Firebase Hosting, Cloudflare Pages).

1. Build/Deploy the repository files as static assets.
2. Ensure you rewrite `/admin` to `/admin.html` if you want clean URLs (already configured in `vercel.json`).
3. Fill out `js/env.js` with the production Firebase and Cloudinary credentials.
4. **Deploy Firestore Rules**: Apply the security rules defined in the root `firestore.rules` file to your Firebase console under **Firestore Database > Rules** (or deploy via Firebase CLI) to secure config, media, and bookings data.
5. Give the hotel owner the deployed admin page URL and the configured login credentials.

