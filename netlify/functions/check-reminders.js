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

  const header = { alg: 'RS256', typ: 'JWT' };
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

const FALLBACK_FIREBASE_KEY = {
  type: "service_account",
  project_id: "justus-5b537",
  private_key_id: "f0f7e2e1797e9fdaedf762cbdc70bf96e463968e",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCXIbUQjPvA+YYh\nrLrsmAN/r5aDjGGiIDWBRWk9TVe4uY5WVJfiB+JkoOaX84xKFYgNUqHJqGN2mW40\n+rNEHo6OKDJtPNGNQJPVgFAjjG+2OZUvAk4U98AEOmfHO85U4YE2kGX2Yf3uQGgc\nLBRqZpoWQ9voUyJfxE+l1+ThaygepopUq3JO++1TO18i7se48YnyyaYorIZ3FAIq\nBBmf1UKCRbvC2v6/vIYeU497S1lDRb06gWkFxDern3Jhf4v48AhAhc7BDRv9HFXG\n6o1PHbWkMeXvTGOzvCS8L0sj5KfjfBLz/VaCrRYIklpRxDeQNyyMHOC4hqVcGm1E\niwc5ihlNAgMBAAECggEAA/58DofrT1pI1TL/balGzmURkUBwhBxdzaDL+zbEDrm4\nrUdnDC4xKX+nGHTzTDHteoyoge/VURkU9Il7m11DXzZovsJQt27xeT7+3zGi8inr\na2agMaWqiXIRtA48kbmz9IE0cKJ+V4GUPspbb8RuZhA9C5LG4ckKYdOm1N5EHSs3\nLpDa3daG3NBpYw3LYL+bHl1c+CCOkiIvFJbnihN/fW3df4mQfmZ+lIQ/EbZ2e7uo\nUTm1wAUK9ut1Mkg0CaXXmjgd3OJvngr+yeJv9g37qE6ZRhvFowryL0hIWzK4L0qi\noopJxOf08A+UVf0HvoILLSxEdu7iemDAprjiihXacQKBgQDIwpHbK3jGQqryVREI\nWJya0ek/PjcOKJ9cj3mirs9aAg4DBOwO55JCqrjXWLxVe1Nf7mwS0DkB/D+NYPJF\nMLwBV66YwwqXJg0BTknpVSBpYktuetm7xnPMjIV1g1WECYEuIRBvmQse7gnHhwdN\nXlIa/Tfd7YGEvz3M1l6acw41TwKBgQDAt1d1CnmW50knHmTHRw8wdohoeCCGsHy+\nnct672RFxvbYdfFMFJ6W9djb6PvFYMHgax5bRkbHIbbJjHcO7vI3YX3siE/lI4ho\ncVoDF0NmhiYVzGK7BW/GamvPM1G+dHbEIgNSom5BmGNEhMWG8AEyyFNT6K1q65u8\nS6fN42VYowKBgFiLgFsjJESFWPJC1J1Sv9eE55QOM6gaAJeJbEN1SFzRdS6duCOm\nvRqMQ7QvHfmxyAcSmDYAAnS+taT8cj5UDUemTYpw07XwgWHnDrBL7FyujshuhKPO\nFnrMK3y17TysGH6o9J/T51S/9i47ftv/0sS2lDJcs3hCBNbYYadLQaP/AoGBAI9J\nAe6UnjizuDEsqPN9gu6egudhwZVDLUywl/TMfvpeZ3QjpQfTIOLO4bEH9gIX4a6R\nFl34z3EJQRVzqaXhxRemFfFCnFya4bX96VX4+vUEctasQxAYh7W3tHa3CmUXxKIp\nQ90xxdZhjhUIvrCIS+vNBB+UFTQ0/3KtsZMkKlsPAoGBAIi5h/PXEG4Od+PHXW5X\nlqJ3thLSDr5N9joSlJLasfo96j4kKjF0Qv8fOFrQRltaGodBffQgENDV+PMHiYWh\nAbEyneuJBNa6TY2pd2qx+ELiylsMmgHZFeTQ4q4d6bUKvET8Mo/+bwKhhgIUAkOT\n5wr1FePHeuHPcZyJ9v4rOPcI\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@justus-5b537.iam.gserviceaccount.com",
  client_id: "115110867940781052456",
  token_uri: "https://oauth2.googleapis.com/token"
};

exports.handler = async () => {
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

  const projectId = serviceAccount.project_id || 'justus-5b537';

  try {
    const accessToken = await getAccessToken(serviceAccount);

    // 1. Fetch pending reminder notes from Firestore
    const notesUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/noticeboard_notes`;
    const notesRes = await fetch(notesUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!notesRes.ok) {
      const err = await notesRes.text();
      return { statusCode: 200, body: JSON.stringify({ status: 'warn', message: err }) };
    }

    const notesData = await notesRes.json();
    const documents = notesData.documents || [];
    const nowIso = new Date().toISOString();

    const dueNotes = [];
    for (const doc of documents) {
      const f = doc.fields || {};
      const category = f.category?.stringValue;
      const reminderTime = f.reminderTime?.stringValue;
      const reminded = f.reminded?.booleanValue;

      if (category === 'Reminder' && reminderTime && !reminded) {
        // Compare ISO strings or timestamps
        const remDate = new Date(reminderTime).toISOString();
        if (remDate <= nowIso) {
          dueNotes.push({
            name: doc.name,
            author: f.author?.stringValue || 'Family Reminder',
            text: f.text?.stringValue || 'Reminder alert'
          });
        }
      }
    }

    if (dueNotes.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'ok', dispatched: 0 })
      };
    }

    // 2. Fetch FCM device tokens
    const tokensUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/fcm_tokens`;
    const tokensRes = await fetch(tokensUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const tokensData = tokensRes.ok ? await tokensRes.json() : { documents: [] };
    const tokenDocs = tokensData.documents || [];
    const normalizeUser = (u) => {
      const normalized = (u || '').toLowerCase().trim();
      return (normalized === 'olivia' || normalized === 'liv') ? 'liv' : normalized;
    };

    const tokensByUser = new Map();
    for (const doc of tokenDocs) {
      const fields = doc.fields || {};
      const token = fields.token?.stringValue;
      if (!token) continue;
      const userKey = normalizeUser(fields.user?.stringValue) || token;
      const lastActiveRaw = fields.lastActiveAt?.timestampValue || fields.updatedAt?.timestampValue;
      const lastActiveTime = lastActiveRaw ? new Date(lastActiveRaw).getTime() : 0;

      const existing = tokensByUser.get(userKey);
      if (!existing || lastActiveTime > existing.lastActiveTime) {
        tokensByUser.set(userKey, { token, lastActiveTime });
      }
    }
    const activeTokens = Array.from(tokensByUser.values()).map(v => v.token);

    // 3. For each due note, send push notification and mark reminded
    let dispatchedCount = 0;
    for (const note of dueNotes) {
      const title = `⏰ Reminder: ${note.author}`;
      const body = note.text;

      for (const token of activeTokens) {
        const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
        await fetch(fcmUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            message: {
              token,
              notification: { title, body },
              data: { url: '/#noticeboard', title, body },
              webpush: {
                headers: { Urgency: 'high', TTL: '86400' },
                notification: {
                  title,
                  body,
                  icon: '/JustUs Icon.png',
                  badge: '/JustUs Icon.png',
                  sound: 'default'
                },
                fcm_options: { link: '/#noticeboard' }
              },
              apns: {
                headers: { 'apns-priority': '10', 'apns-push-type': 'alert' },
                payload: {
                  aps: {
                    alert: { title, body },
                    sound: 'default',
                    badge: 1
                  }
                }
              }
            }
          })
        }).catch(() => {});
      }

      // Mark note as reminded in Firestore via PATCH
      const patchUrl = `https://firestore.googleapis.com/v1/${note.name}?updateMask.fieldPaths=reminded`;
      await fetch(patchUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          fields: {
            reminded: { booleanValue: true }
          }
        })
      }).catch(() => {});

      dispatchedCount++;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'ok', dispatched: dispatchedCount })
    };
  } catch (err) {
    console.error('Error running check-reminders:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
