const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 3,
    maxlength: 20,
    match: /^[a-zA-Z0-9_-]+$/,
    set: v => v.toLowerCase().trim()
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  discordId: { type: String, unique: true, sparse: true },
  discordUsername: { type: String },
  discordAvatar: { type: String },
  displayName: { type: String, maxlength: 50 },
  bio: { type: String, maxlength: 500 },
  avatar: { type: String },
  bannerImage: { type: String },
  theme: { type: String, enum: ['dark','light','neon','gradient'], default: 'dark' },
  backgroundEffect: { type: String, enum: ['none','falling-stars','floating-bubbles','black-hole'], default: 'none' },
  links: { type: Array, default: [] },
  media: { type: Array, default: [] }
}, { timestamps: true });

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
