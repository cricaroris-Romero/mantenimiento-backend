const fs = require('fs');
const path = require('path');

const files = {
  'OAUTH_CLIENT_JSON': 'oauth-client.json',
  'OAUTH_TOKENS_JSON': 'tokens.json'
};

console.log('=========================================');
console.log('COPIA ESTOS VALORES A RENDER.COM');
console.log('=========================================');
console.log('');

const envVars = {
  GMAIL_USER: 'distribuidora.beerman@gmail.com',
  DRIVE_FOLDER_ID: process.env.DRIVE_FOLDER_ID || '1UmwhrBYucjreLABYGSsAhV9FcuJiBEFL',
  GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD || '(pendiente)'
};

for (const [key, file] of Object.entries(files)) {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    envVars[key] = content;
  }
}

console.log(JSON.stringify(envVars, null, 2));
console.log('');
console.log('=========================================');
console.log('PASOS EN RENDER:');
console.log('1. Ve a https://dashboard.render.com');
console.log('2. New + > Web Service');
console.log('3. Conecta tu GitHub y selecciona el repo');
console.log('4. Nombre: mantenimiento-backend');
console.log('5. Root Directory: backend');
console.log('6. Build Command: npm install');
console.log('7. Start Command: node server.js');
console.log('8. En Advanced > Add Environment Variable');
console.log('   pega cada variable de arriba');
console.log('=========================================');
