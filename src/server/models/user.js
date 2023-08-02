const mongoose = require('mongoose');
const User = new mongoose.Schema({
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    emailVerified:{
        type:Boolean,
        required:true,
        default: false,
    },
    password: {
      type: String,
      required: true,
    },
    creationDate: {
      type: Date,
      default: Date.now,
    },
    placeCooldown:{
      type:Date,
      default: Date.now,
    },
    privileges: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    ban: {
      isBanned: {
        type: Boolean,
        default: false,
      },
      reason: {
        type: String,
        default: null,
      },
      duration: {
        type: Date,
        default: null,
      },
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  }, {
    timestamps: true,
  });
module.exports = mongoose.model('User',User);