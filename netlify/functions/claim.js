const { createHash } = require("node:crypto");

const eligibleTokenHashes = new Set([
  "779dd9bb89944f80a1e19567e8b982a366c6d8603b9d78e79da3d012d3161b91",
  "ae13727f6d417cd7af75cec2a1f8ff75f331e7bbb1771a2761d720e3dc85a8dc",
  "635deb0488d27fc4e4611d132d350f32884eb0e7923ee9a0fa13c8b554a1c5c9",
  "a9412b6b71db9618880e69821a02dfaba302e24d3740c2417df676f7caf69319",
  "cc5ccf4444b72dd0539edd0bd3b1b7272ab46b8b2d1c8532bf3ecf9dc0be2397",
  "9a2fc37e2fa7b4663b7465bb5079216416e085ca17da2b497485256b40e85514",
  "aeaf3d6a4abf8737042bbfb9df49a50e1e0ed73799a72bc8403220a8481983cc",
  "52add833d1018befdb5e4f51dc3ea9220b3c6b2e1d3b332aee75f46678bfe3a2",
  "79c852ad7ebcf1c61646759ec331cfc854b3178b231c4961b0f88a5e1e5de3bc",
  "b4b1faed382f1d1476541a89ef413c03822d0e5e62707c2f7baffe4ffd472eab"
]);

function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders
    },
    body: JSON.stringify(body)
  };
}

function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hasClaimCookie(event, tokenHash) {
  const cookie = event.headers.cookie || event.headers.Cookie || "";
  return cookie.split(";").some((part) => part.trim() === `co_claim=${tokenHash}`);
}

function claimCookie(tokenHash) {
  return `co_claim=${tokenHash}; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=Lax`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { status: "method_not_allowed" });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (error) {
    return json(400, { status: "invalid" });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!/^[A-Za-z0-9_-]{24,128}$/.test(token)) {
    return json(403, { status: "invalid" });
  }

  const tokenHash = sha256Hex(token);
  if (!eligibleTokenHashes.has(tokenHash)) {
    return json(403, { status: "invalid" });
  }

  const { getStore } = await import("@netlify/blobs");
  const store = getStore({
    name: "creativity-oasis-claims",
    consistency: "strong"
  });
  const claimKey = `claim-${tokenHash}`;
  const existingClaim = await store.get(claimKey, {
    type: "json",
    consistency: "strong"
  });

  if (existingClaim) {
    if (hasClaimCookie(event, tokenHash)) {
      return json(200, {
        status: "accepted",
        repeat: true,
        claimCode: existingClaim.claimCode
      }, {
        "Set-Cookie": claimCookie(tokenHash)
      });
    }

    return json(409, { status: "already_claimed" });
  }

  const claimCode = tokenHash.slice(0, 8).toUpperCase();
  const claim = {
    claimCode,
    claimedAt: new Date().toISOString()
  };

  const result = await store.setJSON(claimKey, claim, {
    onlyIfNew: true
  });

  if (result && result.modified === false) {
    return json(409, { status: "already_claimed" });
  }

  return json(200, {
    status: "accepted",
    claimCode
  }, {
    "Set-Cookie": claimCookie(tokenHash)
  });
};
