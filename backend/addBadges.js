const mongoose = require('mongoose');
const User = require('./models/User');

require('dotenv').config({ path: './.env' });

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI, {
  tlsCAFile: './certs/mongo-ca.crt',
  tlsCertificateKeyFile: './certs/mongo-client.pem'
}).then(async () => {
  console.log('✅ Conectado ao MongoDB');
  
  const user = await User.findOne({ username: 'oliveira' });
  
  if (user) {
    user.badges = [
      {
        code: 'dev-ativo',
        name: 'Desenvolvedor Ativo',
        iconUrl: 'https://cdn.discordapp.com/badge-icons/1127971993427001444/a_e47041dd7e9aa4a8186d7eaa4d8fb59f.webp',
        description: 'Contribuidor ativo da comunidade',
        source: 'admin',
        awardedAt: new Date()
      },
      {
        code: 'founder',
        name: 'Fundador',
        iconUrl: 'https://cdn.discordapp.com/badge-icons/1127971993427001444/a_e47041dd7e9aa4a8186d7eaa4d8fb59f.webp',
        description: 'Membro fundador do projeto',
        source: 'admin',
        awardedAt: new Date()
      },
      {
        code: 'verified',
        name: 'Verificado',
        iconUrl: 'https://cdn.discordapp.com/badge-icons/1127971993427001444/a_e47041dd7e9aa4a8186d7eaa4d8fb59f.webp',
        description: 'Perfil verificado',
        source: 'admin',
        awardedAt: new Date()
      }
    ];
    
    await user.save();
    console.log('✅ Badges adicionadas ao usuário oliveira:');
    console.log(JSON.stringify(user.badges, null, 2));
  } else {
    console.log('❌ Usuário oliveira não encontrado');
  }
  
  mongoose.connection.close();
  process.exit(0);
}).catch(err => {
  console.error('❌ Erro ao conectar ao MongoDB:', err);
  process.exit(1);
});
