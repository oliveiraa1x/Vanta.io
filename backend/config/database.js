const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Aceita variáveis padrão comuns: MONGO_URI, MONGODB_URI, MONGO_URL, DATABASE_URL ou DATABASE_URI
const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.MONGO_URL ||
  process.env.DATABASE_URL ||
  process.env.DATABASE_URI;

async function connectMongo() {
  try {
    if (!MONGO_URI) {
      console.error('❌ Variável de ambiente de conexão Mongo ausente.');
      console.error('Defina uma das seguintes: MONGO_URI, DATABASE_URL ou DATABASE_URI.');
      throw new Error('MONGO_URI ausente');
    }

    // Evita URI local em produção/containers
    const isLocalHost = /localhost|127\.0\.0\.1/.test(MONGO_URI);
    const isProduction = process.env.NODE_ENV === 'production';
    if (isLocalHost && isProduction) {
      console.error('❌ MONGO_URI aponta para localhost, o que não funciona no SquareCloud.');
      console.error('Atualize MONGO_URI para um endpoint remoto (ex.: MongoDB Atlas ou instância gerenciada).');
      throw new Error('MONGO_URI inválida para produção');
    }

    const options = {
      serverSelectionTimeoutMS: 10000,
    };

    // TLS configurável por ENV ou automaticamente habilitado quando porta != 27017
    const envTls = String(process.env.MONGO_TLS || '').toLowerCase();
    const autoTls = !envTls && !/localhost|127\.0\.0\.1/.test(MONGO_URI) && !/:(27017)(\/|$)/.test(MONGO_URI);
    const enableTls = envTls === 'true' || autoTls;

    if (enableTls) {
      options.tls = true;

      // Permite informar caminhos explícitos via ENV ou cair para defaults no repo
      const caPath =
        process.env.MONGO_TLS_CA_PATH || path.join(__dirname, '../certs/mongo-ca.crt');
      const pemPath =
        process.env.MONGO_TLS_CERT_PATH || path.join(__dirname, '../certs/mongo-client.pem');

      if (fs.existsSync(caPath)) {
        options.tlsCAFile = caPath;
      }
      if (fs.existsSync(pemPath)) {
        options.tlsCertificateKeyFile = pemPath;
      }

      // Opcional: permitir cert inválido (útil para CA self-signed)
      const allowInvalid = String(process.env.MONGO_TLS_ALLOW_INVALID || '').toLowerCase() === 'true';
      if (allowInvalid) {
        options.tlsAllowInvalidCertificates = true;
        options.tlsAllowInvalidHostnames = true;
      }

      console.log(
        `🔐 MongoDB TLS habilitado (auto: ${autoTls}, ca: ${options.tlsCAFile || 'nenhum'}, client: ${options.tlsCertificateKeyFile || 'nenhum'}, allowInvalid: ${allowInvalid})`
      );
    }

    // Log seguro do URI (sem senha) para depuração
    const safeUri = String(MONGO_URI).replace(/:\/\/([^:]+):[^@]+@/, '://$1:***@');
    console.log(`Conectando ao MongoDB usando URI: ${safeUri}`);

    await mongoose.connect(MONGO_URI, options);
    console.log('Conectado ao MongoDB');
  } catch (err) {
    console.error('Erro ao conectar ao MongoDB:', err.message);
    throw err;
  }
}

module.exports = { mongoose, connectMongo };
