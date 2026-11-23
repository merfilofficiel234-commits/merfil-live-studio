const UPSTREAM_BASE = "https://studio.upstream.so/api/v1";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function safeDestination(value) {
  if (!value || typeof value !== "object") return null;
  return {
    id: value.id,
    name: value.name,
    platform: value.platform,
    status: value.status,
    include_in_schedule: value.include_in_schedule
  };
}

export async function onRequest({ request, env }) {
  const adminCode = request.headers.get("x-mls-admin-code") || "";
  const expectedCode = String(env.MLS_ADMIN_CODE || "");

  if (!expectedCode || adminCode !== expectedCode) {
    return json({ success: false, message: "Accès non autorisé. Vérifie le code administrateur MLS." }, 401);
  }

  const apiKey = String(env.UPSTREAM_API_KEY || "").replace(/[\r\n\t]/g, "").trim();
  if (!apiKey) {
    return json({ success: false, message: "Clé API Upstream absente de la configuration serveur." }, 500);
  }

  const url = new URL(request.url);
  const streamId = (url.searchParams.get("streamId") || "").trim();
  const destinationId = (url.searchParams.get("destinationId") || "").trim();
  const method = request.method.toUpperCase();

  if (!/^[A-Za-z0-9_-]{1,100}$/.test(streamId)) {
    return json({ success: false, message: "Identifiant de flux invalide." }, 400);
  }
  if (["PATCH", "DELETE"].includes(method) && !/^[A-Za-z0-9_-]{1,100}$/.test(destinationId)) {
    return json({ success: false, message: "Identifiant de destination invalide." }, 400);
  }
  if (!["GET", "POST", "PATCH", "DELETE"].includes(method)) {
    return json({ success: false, message: "Méthode non autorisée." }, 405);
  }

  const endpoint = `${UPSTREAM_BASE}/streams/${encodeURIComponent(streamId)}/destinations` +
    (destinationId ? `/${encodeURIComponent(destinationId)}` : "");

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json"
  };
  const options = { method, headers };

  if (["POST", "PATCH"].includes(method)) {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ success: false, message: "Le contenu envoyé n'est pas un JSON valide." }, 400);
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ success: false, message: "Données de destination invalides." }, 400);
    }

    const allowed = ["key", "name", "platform", "status", "include_in_schedule", "url"];
    const clean = {};
    for (const field of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, field)) clean[field] = body[field];
    }

    if (typeof clean.name !== "string" || !clean.name.trim() || clean.name.length > 100) {
      return json({ success: false, message: "Le nom de la destination est obligatoire (100 caractères maximum)." }, 400);
    }
    if (method === "POST") {
      const platforms = ["youtube", "twitch", "facebook", "instagram", "mixcloud", "rumble", "kick", "custom", "customsrt"];
      if (typeof clean.key !== "string" || !clean.key.trim() || clean.key.length > 510) {
        return json({ success: false, message: "La clé de diffusion est obligatoire et doit contenir au maximum 510 caractères." }, 400);
      }
      if (!platforms.includes(clean.platform)) {
        return json({ success: false, message: "Plateforme non prise en charge." }, 400);
      }
    }
    if (clean.key !== undefined && (typeof clean.key !== "string" || clean.key.length > 510)) {
      return json({ success: false, message: "Clé de diffusion invalide." }, 400);
    }
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(clean);
  }

  try {
    const upstream = await fetch(endpoint, options);
    if (upstream.status === 204) {
      return json({ success: true, message: "Destination supprimée." });
    }

    let result = {};
    try {
      result = await upstream.json();
    } catch {
      result = {};
    }

    if (!upstream.ok) {
      const message = typeof result.message === "string"
        ? result.message
        : "Upstream n'a pas accepté la demande.";
      return json({ success: false, message }, upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502);
    }

    if (method === "GET") {
      const list = Array.isArray(result.data) ? result.data : [];
      return json({ success: true, data: list.map(safeDestination).filter(Boolean) });
    }

    return json({
      success: true,
      data: safeDestination(result.data) || null,
      message: method === "POST" ? "Destination ajoutée." : "Destination mise à jour."
    }, upstream.status === 201 ? 201 : 200);
  } catch {
    return json({ success: false, message: "Impossible de joindre Upstream. Réessaie dans un instant." }, 502);
  }
}
