const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const root = path.resolve(__dirname);
const port = Number(process.env.PORT || 8787);
const maxWinners = Number(process.env.MAX_WINNERS || 10);
const claimsPath = process.env.LOCAL_CLAIMS_PATH
  ? path.resolve(process.env.LOCAL_CLAIMS_PATH)
  : path.join(root, "local-claims.json");

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".sql": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function eligibleHashes() {
  const seed = fs.readFileSync(path.join(root, "seed-winning-tokens.sql"), "utf8");
  return new Set([...seed.matchAll(/'([a-f0-9]{64})'/g)].map((match) => match[1]));
}

function readClaims() {
  try {
    return JSON.parse(fs.readFileSync(claimsPath, "utf8"));
  } catch (error) {
    return { claims: {} };
  }
}

function writeClaims(data) {
  fs.mkdirSync(path.dirname(claimsPath), { recursive: true });
  fs.writeFileSync(claimsPath, JSON.stringify(data, null, 2));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 10000) {
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function sendJson(response, statusCode, data, cookie) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  };
  if (cookie) {
    headers["Set-Cookie"] = cookie;
  }
  response.writeHead(statusCode, headers);
  response.end(JSON.stringify(data));
}

function hasClaimCookie(request, tokenHash) {
  const cookie = request.headers.cookie || "";
  return cookie.split(";").some((part) => part.trim() === `co_claim=${tokenHash}`);
}

function claimCookie(tokenHash) {
  return `co_claim=${tokenHash}; Path=/; Max-Age=604800; HttpOnly; SameSite=Lax`;
}

async function handleClaim(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { status: "method_not_allowed" });
    return;
  }

  let body;
  try {
    body = JSON.parse(await readBody(request));
  } catch (error) {
    sendJson(response, 400, { status: "invalid" });
    return;
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!/^[A-Za-z0-9_-]{24,128}$/.test(token)) {
    sendJson(response, 403, { status: "invalid" });
    return;
  }

  const tokenHash = sha256(token);
  if (!eligibleHashes().has(tokenHash)) {
    sendJson(response, 403, { status: "invalid" });
    return;
  }

  const data = readClaims();
  const existing = data.claims[tokenHash];
  if (existing) {
    if (hasClaimCookie(request, tokenHash)) {
      sendJson(response, 200, {
        status: "accepted",
        repeat: true,
        claimCode: existing.claimCode
      }, claimCookie(tokenHash));
      return;
    }

    sendJson(response, 409, { status: "already_claimed" });
    return;
  }

  const totalClaims = Object.keys(data.claims).length;
  if (totalClaims >= maxWinners) {
    sendJson(response, 409, { status: "all_claimed" });
    return;
  }

  const claimCode = tokenHash.slice(0, 8).toUpperCase();
  data.claims[tokenHash] = {
    claimCode,
    claimedAt: new Date().toISOString()
  };
  writeClaims(data);

  sendJson(response, 200, {
    status: "accepted",
    claimCode,
    remaining: Math.max(0, maxWinners - totalClaims - 1)
  }, claimCookie(tokenHash));
}

function sendFile(response, requestPath) {
  const resolved = path.resolve(root, requestPath === "/" ? "not-winner.html" : requestPath.slice(1));
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(resolved, (error, file) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(resolved)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    response.end(file);
  });
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || "127.0.0.1"}`);

    if (url.pathname === "/api/claim") {
      await handleClaim(request, response);
      return;
    }

    if (url.pathname === "/api/reset-local-claims") {
      writeClaims({ claims: {} });
      sendJson(response, 200, { status: "reset" });
      return;
    }

    sendFile(response, decodeURIComponent(url.pathname));
  } catch (error) {
    console.error(error);
    if (!response.headersSent) {
      sendJson(response, 500, {
        status: "server_error",
        message: error && error.message ? error.message : String(error)
      });
    } else {
      response.end();
    }
  }
});

server.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Creativity Oasis test server: http://127.0.0.1:${port}`);
  console.log("Open local-test-links.csv for ready-to-test URLs.");
});
