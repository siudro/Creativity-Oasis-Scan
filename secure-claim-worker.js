const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...extraHeaders
    }
  });
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) {
    return {};
  }

  const allowedOrigins = String(env.ALLOWED_ORIGIN || env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin"
  };
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function maxWinners(env) {
  const configured = Number(env.MAX_WINNERS || 10);
  if (!Number.isFinite(configured) || configured < 1) {
    return 10;
  }
  return Math.min(Math.floor(configured), 1000);
}

function hasClaimCookie(request, tokenHash) {
  const cookie = request.headers.get("Cookie") || "";
  return cookie.split(";").some((part) => part.trim() === `co_claim=${tokenHash}`);
}

function claimCookie(tokenHash) {
  return `co_claim=${tokenHash}; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=None`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);
    const send = (data, status = 200, extraHeaders = {}) => json(data, status, {
      ...cors,
      ...extraHeaders
    });

    if (url.pathname !== "/api/claim") {
      return send({ status: "not_found" }, 404);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          ...cors,
          "Cache-Control": "no-store"
        }
      });
    }

    if (request.method !== "POST") {
      return send({ status: "method_not_allowed" }, 405);
    }

    if (!env.DB) {
      return send({ status: "server_error" }, 500);
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return send({ status: "invalid" }, 400);
    }

    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!/^[A-Za-z0-9_-]{24,128}$/.test(token)) {
      return send({ status: "invalid" }, 403);
    }

    const tokenHash = await sha256Hex(token);
    const existingToken = await env.DB.prepare(
      "SELECT token_hash FROM eligible_tokens WHERE token_hash = ?"
    ).bind(tokenHash).first();

    if (!existingToken) {
      return send({ status: "invalid" }, 403);
    }

    const existingClaim = await env.DB.prepare(
      "SELECT claim_code FROM claims WHERE token_hash = ?"
    ).bind(tokenHash).first();

    if (existingClaim) {
      if (hasClaimCookie(request, tokenHash)) {
        return send(
          {
            status: "accepted",
            repeat: true,
            claimCode: existingClaim.claim_code
          },
          200,
          { "Set-Cookie": claimCookie(tokenHash) }
        );
      }

      return send({ status: "already_claimed" }, 409);
    }

    const limit = maxWinners(env);
    const claimCode = tokenHash.slice(0, 8).toUpperCase();
    const insert = await env.DB.prepare(`
      INSERT OR IGNORE INTO claims (token_hash, claimed_at, claim_code)
      SELECT token_hash, datetime('now'), ?2
      FROM eligible_tokens
      WHERE token_hash = ?1
        AND (SELECT COUNT(*) FROM claims) < ?3
    `).bind(tokenHash, claimCode, limit).run();

    if (insert.success && insert.meta && insert.meta.changes === 1) {
      const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM claims").first();
      const remaining = Math.max(0, limit - Number(count.total || 0));
      return send(
        {
          status: "accepted",
          claimCode,
          remaining
        },
        200,
        { "Set-Cookie": claimCookie(tokenHash) }
      );
    }

    const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM claims").first();
    if (Number(count.total || 0) >= limit) {
      return send({ status: "all_claimed" }, 409);
    }

    return send({ status: "invalid" }, 403);
  }
};
