require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User.js');
const Place = require('./models/Place.js');
const Upload = require('./models/Upload.js');
const Booking = require('./models/Booking.js');
const cookieParser = require('cookie-parser');
const imageDownloader = require('image-downloader');
const multer = require('multer');
const fsPromises = require('fs/promises');
const mimeTypes = require('mime-types');

process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);

const app = express();

const bcryptSalt = bcrypt.genSaltSync(10);
const jwtSecret = 'fasefraw4r5r3wq45wdfgw34twdfg'; // TODO: Use an environment variable!
const PORT = 4000; // TODO: Use an environment variable!

/** @type {mongoose.Mongoose} */
let mongooseInstance;

app.use(express.json());
app.use(cookieParser());


const { CLIENT_URL } = process.env;
app.use(cors({
  credentials: true, // Allow credentials (cookies)
  origin: CLIENT_URL || 'http://127.0.0.1:5173', // Allow requests from this origin
}));


app.post('/api/upload-by-link', createAsyncHandler(async (req,res) => {
  const {link} = req.body;

  const newName = 'photo' + new mongoose.Types.ObjectId().toString() + '.bin';
  const destinationPath = __dirname + '/uploads/' + newName;

  const { filename } = await imageDownloader.image({
    url: link,
    dest: destinationPath,
  });

  const mimeType = mimeTypes.lookup(filename) || 'application/octet-stream';

  const { _id } = await Upload.create({
    name: filename,
    mimeType,
    blob: await fsPromises.readFile(destinationPath),
  });

  await fsPromises.unlink(destinationPath);

  res.json(_id.toString());
}));

const photosMiddleware = multer({ storage: multer.memoryStorage() });
app.post('/api/upload', photosMiddleware.array('photos', 100), createAsyncHandler(async (req,res) => {
  /** @type {Express.Multer.File[]} */
  const files = req.files;
  /** @type {string[]} */
  const uploadedFiles = [];

  for (const { originalname, buffer } of files) {
    const mimeType = mimeTypes.lookup(originalname) || 'application/octet-stream';

    const { _id } = await Upload.create({
      name: originalname,
      mimeType,
      blob: buffer,
    });

    uploadedFiles.push(_id.toString());
  }
  res.json(uploadedFiles);
}));

app.get('/uploads/:uploadId', createAsyncHandler(async (req, res) => {
  const { uploadId } = req.params;
  const { mimeType, blob } = await Upload.findById(uploadId);

  res
    .header('Content-Type', mimeType)
    .end(blob);
}));

app.post('/api/register', createAsyncHandler(async (req,res) => {
  const {name,email,password} = req.body;
  try {
    const userDoc = await User.create({
      name,
      email,
      password:bcrypt.hashSync(password, bcryptSalt),
    });
    res.json(userDoc);
  } catch (e) {
    res.status(422).json(e);
  }

}));

app.post('/api/login', createAsyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const userDoc = await User.findOne({ email });
  if (userDoc) {
    const passOk = bcrypt.compareSync(password, userDoc.password);
    if (passOk) {
      const token = await new Promise((resolve, reject) =>
        jwt.sign(
          { email: userDoc.email, id: userDoc._id },
          jwtSecret,
          {},
          (err, token) => {
            if (err) {
              reject(err);
            } else {
              resolve(token);
            }
          }
        )
      );

      // Set cookie with httpOnly, secure, and maxAge
      res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: 'none',
        domain: process.env.NODE_ENV === 'production'
          ? new URL(CLIENT_URL).host
          : undefined,
      }).json(userDoc);
    } else {
      res.status(422).json('pass not ok');
    }
  } else {
    res.status(404).json('not found');
  }
}));

/** @param {import('express').Request} req */
function getUserDataFromReq(req) {
  return new Promise((resolve, reject) => {
    const {token} = req.cookies;
    console.log('token', token)
    jwt.verify(token, jwtSecret, {},  (err, userData) => {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        resolve(userData);
      }
    });
  });
}


app.get('/api/profile', createAsyncHandler(async (req,res) => {
  const userData = await getUserDataFromReq(req);
  const {name,email,_id} = await User.findById(userData.id);
  res.json({name,email,_id});
}));

// Logout route
app.post('/api/logout', (req, res) => {
  // Clear the token cookie
  res.cookie('token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    expires: new Date(0), // Expire immediately
  }).json(true);
});

app.post('/api/places', createAsyncHandler(async (req,res) => {
  const {
    title,address,addedPhotos,description,price,
    perks,extraInfo,checkIn,checkOut,maxGuests,name, email,phone
  } = req.body;

  const userData = await getUserDataFromReq(req);

  const placeDoc = await Place.create({
    owner:userData.id,price,
    title,address,photos:addedPhotos,description,
    perks,extraInfo,checkIn,checkOut,maxGuests,name, email,phone
  });
  res.json(placeDoc);
}));

app.get('/api/user-places', createAsyncHandler(async (req,res) => {
  const userData = await getUserDataFromReq(req);
  res.json(await Place.find({ owner: userData.id }));
}));

app.get('/api/places/:id', createAsyncHandler(async (req,res) => {
  const {id} = req.params;
  res.json(await Place.findById(id));
}));

app.put('/api/places', createAsyncHandler(async (req,res) => {
  const userData = await getUserDataFromReq(req);
  const {
    id, title,address,addedPhotos,description,
    perks,extraInfo,checkIn,checkOut,maxGuests,price,name, email,phone
  } = req.body;
  const placeDoc = await Place.findById(id);
  if (userData.id === placeDoc.owner.toString()) {
    placeDoc.set({
      title,address,photos:addedPhotos,description,
      perks,extraInfo,checkIn,checkOut,maxGuests,price,name, email,phone
    });
    await placeDoc.save();
    res.json('ok');
  } else {
    res.status(404).json({
      error: 'No places found',
    });
  }
}));

app.get('/api/places', createAsyncHandler(async (req,res) => {
  res.json( await Place.find());
}) );

app.post('/api/bookings', createAsyncHandler(async (req, res) => {
  // Extract token from cookies
  const { token } = req.cookies;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  // Verify the token and get user data
  const userData = await new Promise((resolve, reject) => {
    jwt.verify(token, jwtSecret, {}, (err, userData) => {
      if (err) {
        console.error('JWT verification error:', err);
        reject(err);
      } else {
        resolve(userData);
      }
    });
  });

  // Create the booking
  const {
    place, checkIn, checkOut, numberOfGuests, name, phone, price, rooms
  } = req.body;

  const doc = await Booking.create({
    place, checkIn, checkOut, numberOfGuests, name, phone, price, rooms,
    user: userData.id,
  });

  res.json(doc);
}));


app.get('/api/bookings',createAsyncHandler( async (req,res) => {
  const userData = await getUserDataFromReq(req);
  res.json( await Booking.find({ user: userData.id }).populate('place') );
}));

init();

async function init() {
  mongooseInstance = await mongoose.connect(process.env.MONGO_URL);
  console.log('MongoDB connection established successfully!');

  await new Promise((resolve, reject) =>
    app.listen(PORT, error => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    }),
  );
  console.log(`Server running on http://localhost:${PORT}`);
}

/**
 * @param {import('express').RequestHandler} handler
 * @returns {import('express').RequestHandler}
 */
function createAsyncHandler(handler) {
  return async (...args) => {

    const [, res] = args;
    try {
      return await handler(...args);
    } catch (error) {
      console.error(error);
      res.status(500).json({
        status: 500,
        error: error.message,
      });
    }
  }
}

/**
 * @param {string} token
 * @param {Parameters<import('jsonwebtoken')['verify']>[1]} secret
 * @param {import('jsonwebtoken').VerifyOptions} options
 */
async function jwtVerifyAsync(token, secret, options) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secret, options, (error, decoded) => {
      if (error) {
        reject(error);
      } else {
        resolve(decoded);
      }
    });
  });
}
