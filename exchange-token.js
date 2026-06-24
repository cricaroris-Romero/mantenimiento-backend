const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const CLIENT_PATH = path.join(__dirname, 'oauth-client.json');
const TOKEN_PATH = path.join(__dirname, 'tokens.json');
const AUTH_CODE = process.argv[2];

if (!AUTH_CODE) {
  console.error('Uso: node exchange-token.js <codigo>');
  process.exit(1);
}

const creds = JSON.parse(fs.readFileSync(CLIENT_PATH, 'utf8'));
const { client_secret, client_id, redirect_uris } = creds.installed || creds.web;
const oauth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

async function main() {
  const { tokens } = await oauth.getToken(AUTH_CODE);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log('Token guardado en tokens.json');
  console.log('Autenticado como: distribuidora.beerman@gmail.com');
}
main().catch(e => console.error('Error:', e.message));
