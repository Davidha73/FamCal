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
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const tokenUri = serviceAccountKey.token_uri || 'https://oauth2.googleapis.com/token';

  const claimSet = {
    iss: serviceAccountKey.client_email,
    scope: 'https://www.googleapis.com/auth/calendar.events',
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
    throw new Error(`Failed to retrieve Google access token: ${errorText}`);
  }

  const tokenData = await response.json();
  return tokenData.access_token;
}

function normalizeDateTime(dtString) {
  if (!dtString) return null;
  const d = new Date(dtString);
  return isNaN(d.getTime()) ? dtString : d.toISOString();
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    let calendarId = process.env.CALENDAR_ID;
    let rawKey = process.env.SERVICE_ACCOUNT_KEY;

    if (!calendarId || !rawKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Missing CALENDAR_ID or SERVICE_ACCOUNT_KEY environment variables in Netlify.' })
      };
    }

    if (typeof calendarId === 'string') {
      calendarId = calendarId.trim().replace(/^['"]|['"]$/g, '');
    }

    let serviceAccountKey;
    if (typeof rawKey === 'string') {
      let sanitizedKey = rawKey.trim();
      if ((sanitizedKey.startsWith("'") && sanitizedKey.endsWith("'")) || (sanitizedKey.startsWith('"') && sanitizedKey.endsWith('"'))) {
        sanitizedKey = sanitizedKey.slice(1, -1).trim();
      }
      serviceAccountKey = JSON.parse(sanitizedKey);
    } else {
      serviceAccountKey = rawKey;
    }

    const accessToken = await getAccessToken(serviceAccountKey);
    const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

    const authHeaders = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    switch (event.httpMethod) {
      case 'GET': {
        const url = new URL(baseUrl);
        const queryParams = event.queryStringParameters || {};
        if (queryParams.timeMin) {
          url.searchParams.set('timeMin', queryParams.timeMin);
        } else {
          const pastDate = new Date();
          pastDate.setDate(pastDate.getDate() - 31);
          url.searchParams.set('timeMin', pastDate.toISOString());
        }
        if (queryParams.timeMax) {
          url.searchParams.set('timeMax', queryParams.timeMax);
        }
        url.searchParams.set('singleEvents', 'true');
        url.searchParams.set('orderBy', 'startTime');
        url.searchParams.set('maxResults', '250');

        const apiRes = await fetch(url.toString(), {
          method: 'GET',
          headers: authHeaders
        });

        if (!apiRes.ok) {
          const err = await apiRes.text();
          return { statusCode: apiRes.status, headers, body: err };
        }

        const data = await apiRes.json();
        const items = data.items || [];
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(items)
        };
      }

      case 'POST': {
        const body = JSON.parse(event.body || '{}');
        const { summary, start, end, description } = body;

        if (!summary || !start || !end) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'summary, start, and end are required fields.' })
          };
        }

        const payload = {
          summary,
          description: description || '',
          start: { dateTime: normalizeDateTime(start) },
          end: { dateTime: normalizeDateTime(end) }
        };

        const apiRes = await fetch(baseUrl, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(payload)
        });

        const resData = await apiRes.json();
        return {
          statusCode: apiRes.status,
          headers,
          body: JSON.stringify(resData)
        };
      }

      case 'PUT': {
        const body = JSON.parse(event.body || '{}');
        const { eventId, summary, start, end, description } = body;

        if (!eventId || !summary || !start || !end) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'eventId, summary, start, and end are required fields.' })
          };
        }

        const payload = {
          summary,
          description: description || '',
          start: { dateTime: normalizeDateTime(start) },
          end: { dateTime: normalizeDateTime(end) }
        };

        const updateUrl = `${baseUrl}/${encodeURIComponent(eventId)}`;
        const apiRes = await fetch(updateUrl, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify(payload)
        });

        const resData = await apiRes.json();
        return {
          statusCode: apiRes.status,
          headers,
          body: JSON.stringify(resData)
        };
      }

      case 'DELETE': {
        const eventId = event.queryStringParameters && event.queryStringParameters.eventId;

        if (!eventId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing eventId in query parameters.' })
          };
        }

        const deleteUrl = `${baseUrl}/${encodeURIComponent(eventId)}`;
        const apiRes = await fetch(deleteUrl, {
          method: 'DELETE',
          headers: authHeaders
        });

        if (!apiRes.ok) {
          const err = await apiRes.text();
          return { statusCode: apiRes.status, headers, body: err };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, deletedEventId: eventId })
        };
      }

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: `Method ${event.httpMethod} Not Allowed` })
        };
    }
  } catch (error) {
    console.error('Calendar function caught error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal Server Error', details: error.stack })
    };
  }
};
