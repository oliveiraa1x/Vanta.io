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
  backgroundEffect: { type: String, enum: ['none','falling-stars','floating-bubbles','black-hole','video'], default: 'none' },
  backgroundVideo: { type: String }, // Vídeo de fundo (até 15s)
  backgroundAudio: { type: String }, // Áudio ambiente (genérico/fallback)
  backgroundAudioDesktop: { type: String }, // Áudio para desktop
  backgroundAudioMobile: { type: String }, // Áudio para mobile
  links: { type: Array, default: [] },
  media: { type: Array, default: [] },
  // Role e recursos de comunidade
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  badges: {
    type: [
      new mongoose.Schema({
        code: { type: String, required: true },
        name: { type: String, required: true },
        iconUrl: { type: String },
        description: { type: String },
        source: { type: String, enum: ['admin', 'discord', 'event', 'system'], default: 'admin' },
        awardedAt: { type: Date, default: Date.now }
      }, { _id: true })
    ],
    default: []
  },
  achievements: {
    type: [
      new mongoose.Schema({
        key: { type: String, required: true },
        title: { type: String, required: true },
        progress: { type: Number, default: 0 },
        completedAt: { type: Date }
      }, { _id: true })
    ],
    default: []
  },
  // Dados extras do Discord
  discordPublicFlags: { type: Number },
  discordAvatarDecoration: { type: String }
  ,
  connections: {
    type: Object,
    default: {}
  }
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
