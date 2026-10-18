const crypto = require('crypto');

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function getAccessToken(serviceAccountKey) {
  const now = Math.floor(Date.now() / 1000);
  const tokenUri = serviceAccountKey.token_uri || 'https://oauth2.googleapis.com/token';

  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const claimSet = {
    iss: serviceAccountKey.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/datastore',
    aud: tokenUri,
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaimSet = base64UrlEncode(JSON.stringify(claimSet));
  const signatureInput = `${encodedHeader}.${encodedClaimSet}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);
  const privateKey = (serviceAccountKey.private_key || '').replace(/\\n/g, '\n');
  const signature = signer.sign(privateKey);
  const encodedSignature = base64UrlEncode(signature);

  const jwt = `${signatureInput}.${encodedSignature}`;

  const params = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt
  });

  const response = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to authenticate with Google: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.SERVICE_ACCOUNT_KEY;
  if (!rawKey) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'skipped',
        message: 'FIREBASE_SERVICE_ACCOUNT_KEY not configured. Notifications will dispatch once key is added.'
      })
    };
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(rawKey);
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Invalid service account JSON format' })
    };
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (_) {
    payload = {};
  }

  const title = payload.title || 'JustUs Family Update';
  const body = payload.body || 'You have a new update in JustUs.';
  const sender = (payload.sender || '').toLowerCase();
  const projectId = serviceAccount.project_id || 'justus-5b537';

  try {
    const accessToken = await getAccessToken(serviceAccount);

    // Fetch registered tokens from Firestore REST API
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/fcm_tokens`;
    const tokensRes = await fetch(firestoreUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!tokensRes.ok) {
      const errText = await tokensRes.text();
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'warn', message: `Could not query tokens: ${errText}` })
      };
    }

    const tokensData = await tokensRes.json();
    const documents = tokensData.documents || [];

    const sendPromises = documents.map(async (doc) => {
      const fields = doc.fields || {};
      const token = fields.token?.stringValue;
      const user = (fields.user?.stringValue || '').toLowerCase();

      // Don't send notification to the device that triggered it
      if (!token || (sender && user === sender)) return null;

      const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
      return fetch(fcmUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          message: {
            token,
            notification: {
              title,
              body
            },
            data: {
              url: '/'
            }
          }
        })
      });
    });

    await Promise.all(sendPromises);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'success', sentCount: documents.length })
    };
  } catch (err) {
    console.error('Push notification dispatch error:', err);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'error', message: err.message })
    };
  }
};
