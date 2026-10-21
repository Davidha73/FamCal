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

  const FALLBACK_FIREBASE_KEY = {
    type: "service_account",
    project_id: "justus-5b537",
    private_key_id: "f0f7e2e1797e9fdaedf762cbdc70bf96e463968e",
    private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCXIbUQjPvA+YYh\nrLrsmAN/r5aDjGGiIDWBRWk9TVe4uY5WVJfiB+JkoOaX84xKFYgNUqHJqGN2mW40\n+rNEHo6OKDJtPNGNQJPVgFAjjG+2OZUvAk4U98AEOmfHO85U4YE2kGX2Yf3uQGgc\nLBRqZpoWQ9voUyJfxE+l1+ThaygepopUq3JO++1TO18i7se48YnyyaYorIZ3FAIq\nBBmf1UKCRbvC2v6/vIYeU497S1lDRb06gWkFxDern3Jhf4v48AhAhc7BDRv9HFXG\n6o1PHbWkMeXvTGOzvCS8L0sj5KfjfBLz/VaCrRYIklpRxDeQNyyMHOC4hqVcGm1E\niwc5ihlNAgMBAAECggEAA/58DofrT1pI1TL/balGzmURkUBwhBxdzaDL+zbEDrm4\nrUdnDC4xKX+nGHTzTDHteoyoge/VURkU9Il7m11DXzZovsJQt27xeT7+3zGi8inr\na2agMaWqiXIRtA48kbmz9IE0cKJ+V4GUPspbb8RuZhA9C5LG4ckKYdOm1N5EHSs3\nLpDa3daG3NBpYw3LYL+bHl1c+CCOkiIvFJbnihN/fW3df4mQfmZ+lIQ/EbZ2e7uo\nUTm1wAUK9ut1Mkg0CaXXmjgd3OJvngr+yeJv9g37qE6ZRhvFowryL0hIWzK4L0qi\noopJxOf08A+UVf0HvoILLSxEdu7iemDAprjiihXacQKBgQDIwpHbK3jGQqryVREI\nWJya0ek/PjcOKJ9cj3mirs9aAg4DBOwO55JCqrjXWLxVe1Nf7mwS0DkB/D+NYPJF\nMLwBV66YwwqXJg0BTknpVSBpYktuetm7xnPMjIV1g1WECYEuIRBvmQse7gnHhwdN\nXlIa/Tfd7YGEvz3M1l6acw41TwKBgQDAt1d1CnmW50knHmTHRw8wdohoeCCGsHy+\nnct672RFxvbYdfFMFJ6W9djb6PvFYMHgax5bRkbHIbbJjHcO7vI3YX3siE/lI4ho\ncVoDF0NmhiYVzGK7BW/GamvPM1G+dHbEIgNSom5BmGNEhMWG8AEyyFNT6K1q65u8\nS6fN42VYowKBgFiLgFsjJESFWPJC1J1Sv9eE55QOM6gaAJeJbEN1SFzRdS6duCOm\nvRqMQ7QvHfmxyAcSmDYAAnS+taT8cj5UDUemTYpw07XwgWHnDrBL7FyujshuhKPO\nFnrMK3y17TysGH6o9J/T51S/9i47ftv/0sS2lDJcs3hCBNbYYadLQaP/AoGBAI9J\nAe6UnjizuDEsqPN9gu6egudhwZVDLUywl/TMfvpeZ3QjpQfTIOLO4bEH9gIX4a6R\nFl34z3EJQRVzqaXhxRemFfFCnFya4bX96VX4+vUEctasQxAYh7W3tHa3CmUXxKIp\nQ90xxdZhjhUIvrCIS+vNBB+UFTQ0/3KtsZMkKlsPAoGBAIi5h/PXEG4Od+PHXW5X\nlqJ3thLSDr5N9joSlJLasfo96j4kKjF0Qv8fOFrQRltaGodBffQgENDV+PMHiYWh\nAbEyneuJBNa6TY2pd2qx+ELiylsMmgHZFeTQ4q4d6bUKvET8Mo/+bwKhhgIUAkOT\n5wr1FePHeuHPcZyJ9v4rOPcI\n-----END PRIVATE KEY-----\n",
    client_email: "firebase-adminsdk-fbsvc@justus-5b537.iam.gserviceaccount.com",
    client_id: "115110867940781052456",
    token_uri: "https://oauth2.googleapis.com/token"
  };

  let serviceAccount = FALLBACK_FIREBASE_KEY;
  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (rawKey) {
    try {
      const parsed = JSON.parse(rawKey);
      if (parsed && (parsed.project_id === 'justus-5b537' || parsed.client_email)) {
        serviceAccount = parsed;
      }
    } catch (_) {}
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

    const targetToken = payload.targetToken;
    const senderToken = payload.senderToken;
    const isTest = payload.isTest === true;
    const targetTab = payload.tab || (payload.url && payload.url.includes('messages') ? 'messages' : ((payload.url && (payload.url.includes('noticeboard') || payload.url.includes('lists'))) ? 'noticeboard' : 'calendar'));
    const targetUrl = payload.url || `/?tab=${targetTab}`;

    const sendPromises = documents.map(async (doc) => {
      const fields = doc.fields || {};
      const token = fields.token?.stringValue;
      const user = (fields.user?.stringValue || '').toLowerCase();

      // If test token is specified, only send to that token
      if (targetToken && token !== targetToken) return null;

      // Don't send notification to the exact device that triggered it
      if (senderToken && token === senderToken) return null;

      // If senderToken is not provided and user matches sender, skip to avoid self-notification
      if (!senderToken && !isTest && sender && user === sender) return null;
      const mentions = Array.isArray(payload.mentions) ? payload.mentions.map(m => String(m).toLowerCase()) : [];
      const isMentioned = mentions.includes(user) || (user === 'olivia' && mentions.includes('liv')) || (user === 'liv' && mentions.includes('olivia'));
      const docTitle = isMentioned ? `💬 ${payload.sender || 'Someone'} mentioned you` : title;

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
              title: docTitle,
              body
            },
            data: {
              url: targetUrl,
              tab: targetTab,
              title: docTitle,
              body
            },
            webpush: {
              headers: {
                Urgency: 'high',
                TTL: '86400'
              },
              notification: {
                title: docTitle,
                body,
                icon: '/JustUs Icon.png',
                badge: '/JustUs Icon.png',
                sound: 'default'
              },
              fcm_options: {
                link: targetUrl
              }
            },
            apns: {
              headers: {
                'apns-priority': '10',
                'apns-push-type': 'alert'
              },
              payload: {
                aps: {
                  alert: {
                    title: docTitle,
                    body
                  },
                  sound: 'default',
                  badge: 1
                },
                url: targetUrl,
                tab: targetTab
              }
            }
          }
        })
      }).then(async (res) => {
        if (!res.ok) {
          const errText = await res.text();
          console.warn('FCM send failed:', errText);
          return { success: false, error: errText };
        }
        return { success: true };
      }).catch((err) => {
        console.warn('FCM send error:', err);
        return { success: false, error: err.message };
      });
    });

    if (documents.length === 0) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'no_tokens',
          message: 'No registered device tokens found in Firestore. Tap the Push Alerts toggle on your phone to register it.'
        })
      };
    }

    const results = await Promise.all(sendPromises);
    const validResults = results.filter(Boolean);
    const successfulSends = validResults.filter(r => r.success);
    const failedSends = validResults.filter(r => !r.success);

    if (validResults.length === 0) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'skipped',
          message: `Found ${documents.length} token(s) in database, but none matched (sender '${sender}' filtered out).`
        })
      };
    }

    if (successfulSends.length === 0) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'send_failed',
          message: `Attempted delivery to ${validResults.length} device(s) but FCM failed: ${failedSends[0]?.error || 'Unknown error'}`
        })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'success',
        sentCount: successfulSends.length,
        totalTokens: documents.length,
        message: `Delivered push to ${successfulSends.length} of ${documents.length} registered device(s).`
      })
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
