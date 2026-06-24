const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');

const TOKEN_PATH = path.join(__dirname, 'tokens.json');
const CLIENT_PATH = path.join(__dirname, 'oauth-client.json');
const SERVICE_ACCOUNT_PATH = process.env.SERVICE_ACCOUNT_PATH || path.join(__dirname, 'service-account.json');

function getOAuthCredentials() {
  if (process.env.OAUTH_CLIENT_JSON && process.env.OAUTH_TOKENS_JSON) {
    return {
      clientCreds: JSON.parse(process.env.OAUTH_CLIENT_JSON),
      tokens: JSON.parse(process.env.OAUTH_TOKENS_JSON)
    };
  }

  if (fs.existsSync(CLIENT_PATH) && fs.existsSync(TOKEN_PATH)) {
    return {
      clientCreds: JSON.parse(fs.readFileSync(CLIENT_PATH, 'utf8')),
      tokens: JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'))
    };
  }

  return null;
}

async function getAuthClient() {
  const oauth = getOAuthCredentials();
  if (oauth) {
    const { client_secret, client_id, redirect_uris } = oauth.clientCreds.installed || oauth.clientCreds.web;
    const client = new OAuth2Client(client_id, client_secret, redirect_uris?.[0] || 'http://localhost');
    client.setCredentials(oauth.tokens);

    client.on('tokens', (newTokens) => {
      const updated = { ...oauth.tokens, ...newTokens };
      if (fs.existsSync(TOKEN_PATH)) {
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(updated, null, 2));
      }
    });

    return client;
  }

  if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    const credentials = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
    return new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file']
    });
  }

  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    return new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON),
      scopes: ['https://www.googleapis.com/auth/drive.file']
    });
  }

  console.warn('No hay credenciales. Simulando subida a Drive.');
  return null;
}

async function uploadToDrive({ pdfBuffer, fileName, folderId }) {
  const auth = await getAuthClient();

  if (!auth) {
    console.log(`[SIMULADO] Subiendo ${fileName} a carpeta ${folderId}`);
    return { webViewLink: null, simulated: true };
  }

  const drive = google.drive({ version: 'v3', auth });

  const fileMetadata = {
    name: fileName,
    parents: [folderId]
  };

  const media = {
    mimeType: 'application/pdf',
    body: Readable.from(pdfBuffer)
  };

  const response = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id, webViewLink',
    supportsAllDrives: true
  });

  return response.data;
}

module.exports = { uploadToDrive };
