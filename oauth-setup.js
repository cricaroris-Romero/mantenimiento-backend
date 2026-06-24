const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const TOKEN_PATH = path.join(__dirname, 'tokens.json');
const CLIENT_PATH = path.join(__dirname, 'oauth-client.json');

async function setupOAuth() {
  if (!fs.existsSync(CLIENT_PATH)) {
    console.log('=====================================================');
    console.log('PRIMERO: Descarga el archivo OAuth de Google Cloud');
    console.log('=====================================================');
    console.log('1. Ve a: https://console.cloud.google.com/apis/credentials');
    console.log('2. Proyecto: heroic-cedar-500320-k0');
    console.log('3. Clic en "CREAR CREDENCIALES" > "ID de cliente de OAuth"');
    console.log('4. Tipo: "Aplicación de escritorio", Nombre: "Mantenimiento App"');
    console.log('5. Clic en "CREAR" y luego en "DESCARGAR JSON"');
    console.log('6. Guarda el archivo como: backend/oauth-client.json');
    console.log('=====================================================');
    process.exit(1);
  }

  const credentials = JSON.parse(fs.readFileSync(CLIENT_PATH, 'utf8'));
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  const redirectUri = redirect_uris ? redirect_uris[0] : 'http://localhost';

  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri);

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });

  console.log('=====================================================');
  console.log('PASO 1: Abre este enlace en tu navegador:');
  console.log('=====================================================');
  console.log(authUrl);
  console.log('=====================================================');
  console.log('Inicia sesión con: distribuidora.beerman@gmail.com');
  console.log('Acepta los permisos solicitados');
  console.log('=====================================================');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const code = await new Promise((resolve) => {
    rl.question('PASO 2: Pega aquí el código de autorización: ', (code) => {
      resolve(code.trim());
      rl.close();
    });
  });

  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);

  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log('=====================================================');
  console.log('✅ Token guardado en: backend/tokens.json');
  console.log('Ya puedes usar "Enviar" desde la app.');
  console.log('=====================================================');

  const drive = google.drive({ version: 'v3', auth: oAuth2Client });
  const about = await drive.about.get({ fields: 'user' });
  console.log(`Autenticado como: ${about.data.user.displayName} (${about.data.user.emailAddress})`);
}

setupOAuth().catch(console.error);
