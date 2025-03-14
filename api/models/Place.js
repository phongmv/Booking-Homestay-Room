const mongoose = require('mongoose');

const placeSchema = new mongoose.Schema({
  owner: {type:mongoose.Schema.Types.ObjectId, ref:'User'},
  title: String,
  address: String,
  photos: [mongoose.Schema.Types.ObjectId],
  description: String,
  perks: [String],
  extraInfo: String,
  checkIn: Number,
  checkOut: Number,
  maxGuests: Number,
  price: Number,
  name: String,
  email: {type:String, unique:true},
  phone: String
});

const PlaceModel = mongoose.model('Place', placeSchema);

module.exports = PlaceModel;
