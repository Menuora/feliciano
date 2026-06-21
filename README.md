# Feliciano Hotel & Restaurant Template

Vercel-ready hotel and restaurant website template with a professional `/admin` dashboard for bookings, Cloudinary images, website settings, and homepage image settings.

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the environment example:
   ```bash
   copy .env.example .env
   ```

3. Fill in:
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `SESSION_SECRET`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

4. Run locally:
   ```bash
   npm run dev
   ```

5. Open:
   - Website: `http://localhost:3000`
   - Admin: `http://localhost:3000/admin`

`npm run dev` uses the local Express server and does not ask for a Vercel login.

## Verification

Run:

```bash
npm run check
npm run smoke
```

The smoke test confirms `/admin` loads, protected admin APIs block before login, settings work, booking creation works, login works, and the public image page loads.

## Deploy To Vercel

1. Push the project to GitHub.
2. Import it in Vercel.
3. Add the same environment variables from `.env.example` in Vercel project settings.
4. Deploy.
5. Give the hotel owner the deployed `/admin` URL and login credentials.

GitHub Pages can still host the static pages, but bookings, admin login, settings, and Cloudinary-backed gallery data require the Vercel/API setup.
