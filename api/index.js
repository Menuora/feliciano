const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const rootDir = path.join(__dirname, '..');
const localDbPath = path.join(rootDir, 'data', 'db.json');

const defaultSettings = {
  restaurantName: 'Feliciano',
  facebookLink: '#',
  instagramLink: '#',
  twitterLink: '#',
  googleMapsEmbed: '',
  openingTime: '9:00',
  closingTime: '24:00',
  images: {
    heroImage1: 'images/bg_1.jpg',
    heroImage1Secondary: 'images/about-1.jpg',
    heroImage2: 'images/bg_2.jpg',
    heroImage2Secondary: 'images/about.jpg',
    aboutImage1: 'images/about.jpg',
    aboutImage2: 'images/about-1.jpg',
    bookingSideImage: 'images/bg_3.jpg',
    menuHeaderImage: 'images/bg_3.jpg',
    galleryHeaderImage: 'images/bg_4.jpg',
    contactHeaderImage: 'images/bg_3.jpg'
  }
};

const emptyData = {
  settings: defaultSettings,
  bookings: [],
  images: []
};

function hasCloudinary() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

function configureCloudinary() {
  if (!hasCloudinary()) return false;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  return true;
}

function mergeSettings(settings = {}) {
  return {
    ...defaultSettings,
    ...settings,
    images: {
      ...defaultSettings.images,
      ...(settings.images || {})
    }
  };
}

function normalizeData(data) {
  return {
    ...emptyData,
    ...data,
    settings: mergeSettings(data && data.settings),
    bookings: Array.isArray(data && data.bookings) ? data.bookings : [],
    images: Array.isArray(data && data.images) ? data.images : []
  };
}

async function readLocalData() {
  try {
    const raw = await fs.readFile(localDbPath, 'utf8');
    return normalizeData(JSON.parse(raw));
  } catch {
    return normalizeData(emptyData);
  }
}

async function writeLocalData(data) {
  await fs.mkdir(path.dirname(localDbPath), { recursive: true });
  await fs.writeFile(localDbPath, JSON.stringify(normalizeData(data), null, 2));
}

async function readCloudinaryData() {
  configureCloudinary();
  try {
    const resource = await cloudinary.api.resource('hotel-template/app-data', { resource_type: 'raw' });
    const response = await fetch(`${resource.secure_url}?v=${Date.now()}`);
    if (!response.ok) throw new Error('Cloudinary data read failed');
    return normalizeData(await response.json());
  } catch {
    return normalizeData(emptyData);
  }
}

async function writeCloudinaryData(data) {
  configureCloudinary();
  const payload = Buffer.from(JSON.stringify(normalizeData(data), null, 2));
  await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        public_id: 'hotel-template/app-data',
        overwrite: true,
        invalidate: true
      },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(payload);
  });
}

async function readData() {
  return hasCloudinary() ? readCloudinaryData() : readLocalData();
}

async function writeData(data) {
  return hasCloudinary() ? writeCloudinaryData(data) : writeLocalData(data);
}

function sanitizeMapInput(input = '') {
  const value = String(input).trim();
  if (!value) return '';
  const match = value.match(/src=["']([^"']+)["']/i);
  return match ? match[1] : value;
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: 'Admin login required' });
}

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  name: 'feliciano.sid',
  secret: process.env.SESSION_SECRET || 'local-development-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 8
  }
}));

app.use(express.static(rootDir, { extensions: ['html'] }));

app.get('/api/settings', async (req, res) => {
  const data = await readData();
  res.json(data.settings);
});

app.get('/api/images', async (req, res) => {
  const data = await readData();
  res.json(data.images);
});

app.post('/api/bookings', async (req, res) => {
  const { name, phone, email = '', date, time, guests, message = '' } = req.body || {};
  if (!name || !phone || !date || !time || !guests) {
    return res.status(400).json({ error: 'Name, phone, date, time, and guests are required' });
  }
  const data = await readData();
  const booking = {
    id: crypto.randomUUID(),
    name: String(name).trim(),
    phone: String(phone).trim(),
    email: String(email).trim(),
    date: String(date).trim(),
    time: String(time).trim(),
    guests: String(guests).trim(),
    message: String(message).trim(),
    createdAt: new Date().toISOString()
  };
  data.bookings.unshift(booking);
  await writeData(data);
  res.status(201).json({ ok: true, booking });
});

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.json({ ok: true });
  }
  return res.status(401).json({ error: 'Invalid username or password' });
});

app.post('/api/admin/logout', requireAdmin, (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/admin/me', (req, res) => {
  res.json({ isAdmin: Boolean(req.session && req.session.isAdmin) });
});

app.get('/api/admin/bookings', requireAdmin, async (req, res) => {
  const data = await readData();
  res.json(data.bookings);
});

app.delete('/api/admin/bookings/:id', requireAdmin, async (req, res) => {
  const data = await readData();
  data.bookings = data.bookings.filter((booking) => booking.id !== req.params.id);
  await writeData(data);
  res.json({ ok: true });
});

app.put('/api/admin/settings', requireAdmin, async (req, res) => {
  const data = await readData();
  data.settings = mergeSettings({
    ...data.settings,
    restaurantName: req.body.restaurantName || defaultSettings.restaurantName,
    facebookLink: req.body.facebookLink || '#',
    instagramLink: req.body.instagramLink || '#',
    twitterLink: req.body.twitterLink || '#',
    googleMapsEmbed: sanitizeMapInput(req.body.googleMapsEmbed),
    openingTime: req.body.openingTime || defaultSettings.openingTime,
    closingTime: req.body.closingTime || defaultSettings.closingTime
  });
  await writeData(data);
  res.json(data.settings);
});

app.put('/api/admin/home-images', requireAdmin, async (req, res) => {
  const data = await readData();
  data.settings = mergeSettings({
    ...data.settings,
    images: {
      ...data.settings.images,
      ...Object.fromEntries(Object.keys(defaultSettings.images).map((key) => [key, req.body[key] || defaultSettings.images[key]]))
    }
  });
  await writeData(data);
  res.json(data.settings.images);
});

app.post('/api/admin/images', requireAdmin, upload.single('image'), async (req, res) => {
  if (!req.file && !req.body.url) return res.status(400).json({ error: 'Upload an image or paste an image URL' });
  const type = req.body.type === 'full-menu' ? 'full-menu' : 'item';
  const title = String(req.body.title || (type === 'full-menu' ? 'Menu Image' : 'Menu Item')).trim();
  let imageUrl = String(req.body.url || '').trim();
  let publicId = '';

  if (req.file) {
    if (!hasCloudinary()) return res.status(400).json({ error: 'Cloudinary credentials are required for image upload' });
    configureCloudinary();
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `hotel-template/${type}`, resource_type: 'image' },
        (error, uploadResult) => (error ? reject(error) : resolve(uploadResult))
      );
      stream.end(req.file.buffer);
    });
    imageUrl = result.secure_url;
    publicId = result.public_id;
  }

  const data = await readData();
  const image = {
    id: crypto.randomUUID(),
    title,
    type,
    url: imageUrl,
    publicId,
    createdAt: new Date().toISOString()
  };
  data.images.unshift(image);
  await writeData(data);
  res.status(201).json(image);
});

app.delete('/api/admin/images/:id', requireAdmin, async (req, res) => {
  const data = await readData();
  const image = data.images.find((item) => item.id === req.params.id);
  data.images = data.images.filter((item) => item.id !== req.params.id);
  await writeData(data);
  if (image && image.publicId && hasCloudinary()) {
    configureCloudinary();
    cloudinary.uploader.destroy(image.publicId).catch(() => {});
  }
  res.json({ ok: true });
});

module.exports = app;
