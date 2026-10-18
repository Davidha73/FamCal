/**
 * Netlify Function: firebase-config
 * Securely serves client-side Firebase configuration and VAPID key
 * from environment variables to avoid committing plain API keys to GitHub.
 */

const fs = require('fs');
const path = require('path');

function getRawConfig() {
  if (process.env.FIREBASE_CONFIG) {
    return process.env.FIREBASE_CONFIG;
  }
  try {
    const envPath = path.resolve(__dirname, '../../.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/^FIREBASE_CONFIG=(?:'|")?(\{.+?\})(?:'|")?$/m);
      if (match && match[1]) {
        return match[1];
      }
    }
  } catch (_) {}
  return null;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  const rawConfig = getRawConfig();
  if (!rawConfig) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'FIREBASE_CONFIG environment variable is not configured' })
    };
  }

  try {
    const config = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig;
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      },
      body: JSON.stringify(config)
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to parse FIREBASE_CONFIG' })
    };
  }
};
