const http = require('http');

function startServer(app) {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

// Minimal cookie-jar wrapper around fetch so tests can simulate a logged-in
// browser session across multiple requests (fetch itself does not persist
// cookies between calls).
function makeAgent(baseUrl) {
  let cookie = '';

  async function request(method, urlPath, body) {
    const res = await fetch(baseUrl + urlPath, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }
    return { status: res.status, body: json };
  }

  return {
    get: (p) => request('GET', p),
    post: (p, body) => request('POST', p, body),
  };
}

module.exports = { startServer, makeAgent };
