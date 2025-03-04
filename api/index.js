const express = require('express');
const cors = require('cors');
const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User.js');
const Place = require('./models/Place.js');
const Booking = require('./models/Booking.js');
const cookieParser = require('cookie-parser');
const imageDownloader = require('image-downloader');
const {S3Client, PutObjectCommand} = require('@aws-sdk/client-s3');
const multer = require('multer');
const fs = require('fs');
const mime = require('mime-types');

require('dotenv').config();

process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);

const app = express();
const PORT = 4000;

/** @type {mongoose.Mongoose} */
let mongooseInstance;

const bcryptSalt = bcrypt.genSaltSync(10);
const jwtSecret = 'fasefraw4r5r3wq45wdfgw34twdfg';
const bucket = 'dawid-booking-app';

app.use(express.json());
app.use('/upload', express.static(__dirname + '/uploads'))
app.use(cookieParser());


app.use('/uploads', express.static(__dirname+'/uploads'));

const { CLIENT_URL } = process.env;
app.use(cors({
  credentials: true, // Allow credentials (cookies)
  origin: CLIENT_URL || 'http://127.0.0.1:5173', // Allow requests from this origin
}));


app.post('/api/upload-by-link', createAsyncHandler(async (req,res) => {
  const {link} = req.body;
  const newName = 'photo' + Date.now() + '.jpg';
  await imageDownloader.image({
    url: link,
    dest: __dirname + '/uploads/' + newName,
  });
  //@ TODO: can be upgrade upload to S3
  // const url = await uploadToS3('/tmp/' +newName, newName, mime.lookup('/tmp/' +newName));
  res.json(newName);
}));

const photosMiddleware = multer({dest:'uploads/'});
app.post('/api/upload', photosMiddleware.array('photos', 100), createAsyncHandler(async (req,res) => {
  const uploadedFiles = [];
  for (let i = 0; i < req.files.length; i++) {
    const { path, originalname } = req.files[i];
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    const newPath = path.slice('') + '.' + ext;
    console.log({
      newPath, ext, parts, originalname, path
    })
    fs.renameSync(path, newPath);
    uploadedFiles.push(newPath.replace('uploads/', ''))
    // @TO DO: can be upgrade to S3
    // const {path,originalname: originalName,mimetype} = req.files[i];
    // const url = await uploadToS3(path, originalName, mimetype);
    // uploadedFiles.push(url);
  }
  res.json(uploadedFiles);
}));

app.post('/api/register', createAsyncHandler(async (req,res) => {
  await mongoose.connect(process.env.MONGO_URL);
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
  await mongoose.connect(process.env.MONGO_URL);
  const {token} = req.cookies;
  if (token) {
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
      if (err) console.log(err);
      const {name,email,_id} = await User.findById(userData.id);
      res.json({name,email,_id});
    });
  } else {
    res.json(null);
  }
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
  await mongoose.connect(process.env.MONGO_URL);
  const {token} = req.cookies;
  const {
    title,address,addedPhotos,description,price,
    perks,extraInfo,checkIn,checkOut,maxGuests,
  } = req.body;
  jwt.verify(token, jwtSecret, {}, async (err, userData) => {
    if (err) console.log(err);
    const placeDoc = await Place.create({
      owner:userData.id,price,
      title,address,photos:addedPhotos,description,
      perks,extraInfo,checkIn,checkOut,maxGuests,
    });
    res.json(placeDoc);
  });
}));

app.get('/api/user-places', createAsyncHandler(async (req,res) => {
  await mongoose.connect(process.env.MONGO_URL);
  const {token} = req.cookies;
  jwt.verify(token, jwtSecret, {}, async (err, userData) => {
    const {id} = userData;
    res.json( await Place.find({owner:id}) );
  });
}));

app.get('/api/places/:id', createAsyncHandler(async (req,res) => {
  await mongoose.connect(process.env.MONGO_URL);
  const {id} = req.params;
  res.json(await Place.findById(id));
}));

app.put('/api/places', createAsyncHandler(async (req,res) => {
 await mongoose.connect(process.env.MONGO_URL);
  const {token} = req.cookies;
  const {
    id, title,address,addedPhotos,description,
    perks,extraInfo,checkIn,checkOut,maxGuests,price,
  } = req.body;
  jwt.verify(token, jwtSecret, {}, async (err, userData) => {
    if (err) console.log(err);
    const placeDoc = await Place.findById(id);
    if (userData.id === placeDoc.owner.toString()) {
      placeDoc.set({
        title,address,photos:addedPhotos,description,
        perks,extraInfo,checkIn,checkOut,maxGuests,price,
      });
      await placeDoc.save();
      res.json('ok');
    }
  });
}));

app.get('/api/places', createAsyncHandler(async (req,res) => {
  await mongoose.connect(process.env.MONGO_URL);
  res.json( await Place.find() );
}) );

app.post('/api/bookings', createAsyncHandler(async (req, res) => {
  await mongoose.connect(process.env.MONGO_URL);

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
    place, checkIn, checkOut, numberOfGuests, name, phone, price,
  } = req.body;

  const doc = await Booking.create({
    place, checkIn, checkOut, numberOfGuests, name, phone, price,
    user: userData.id,
  });

  res.json(doc);
}));


app.get('/api/bookings',createAsyncHandler( async (req,res) => {
  await mongoose.connect(process.env.MONGO_URL);
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
