
import {
  json,
  currentUser,
  encryptStreamKey,
  validOrigin
} from "../_shared/security.js";

const PLATFORMS = [
  "youtube",
  "facebook",
  "twitch",
  "instagram",
  "kick",
  "rumble",
  "mixcloud",
  "custom"
];

function validId(value) {
  return /^\d+$/.test(String(value || ""));
}

function validServerUrl(value) {
  try {
    const url = new URL(value);
    return ["rtmp:", "rtmps:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function safeDestination(row) {
  return {
    id: row.id,
    name: row.name,
    platform: row.platform,
    server_url: row.server_url,
    created_at: row.created_at
  };
}

export async function onRequest({ request, env }) {
  if (!validOrigin(request)) {
    return json({ success: false, message: "Origine refusée." }, 403);
  }

  if (!env.DB) {
    return json({ success: false, message: "Base de données non configurée." }, 500);
  }

  const user = await currentUser(request, env);

  if (!user) {
    return json({ success: false, message: "Connecte-toi à ton compte." }, 401);
  }

  const method = request.method.toUpperCase();
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!["GET", "POST", "PATCH", "DELETE"].includes(method)) {
    return json({ success: false, message: "Méthode non autorisée." }, 405);
  }

  try {
    if (method === "GET") {
      const result = await env.DB.prepare(
        `SELECT id, name, platform, server_url, created_at
         FROM destinations
         WHERE user_id = ?
         ORDER BY id DESC`
      ).bind(user.id).all();

      return json({
        success: true,
        data: (result.results || []).map(safeDestination)
      });
    }

    if (method === "DELETE") {
      if (!validId(id)) {
        return json({ success: false, message: "Destination invalide." }, 400);
      }

      const result = await env.DB.prepare(
        "DELETE FROM destinations WHERE id = ? AND user_id = ?"
      ).bind(Number(id), user.id).run();

      if (!result.meta.changes) {
        return json({ success: false, message: "Destination introuvable." }, 404);
      }

      return json({
        success: true,
        message: "Destination supprimée."
      });
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return json({ success: false, message: "Données invalides." }, 400);
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ success: false, message: "Données invalides." }, 400);
    }

    const name = body.name === undefined ? undefined : String(body.name).trim();
    const platform = body.platform === undefined ? undefined : String(body.platform).toLowerCase();
    const serverUrl = body.server_url === undefined ? undefined : String(body.server_url).trim();
    const streamKey = body.stream_key;

    if (name !== undefined && (!name || name.length > 100)) {
      return json({ success: false, message: "Nom invalide (100 caractères maximum)." }, 400);
    }

    if (platform !== undefined && !PLATFORMS.includes(platform)) {
      return json({ success: false, message: "Plateforme non prise en charge." }, 400);
    }

    if (serverUrl !== undefined && (!validServerUrl(serverUrl) || serverUrl.length > 500)) {
      return json({ success: false, message: "Adresse RTMP ou RTMPS invalide." }, 400);
    }

    if (method === "POST") {
      if (!name || !platform || !serverUrl ||
          typeof streamKey !== "string" ||
          !streamKey.trim() || streamKey.length > 2000) {
        return json({
          success: false,
          message: "Nom, plateforme, adresse du serveur et clé de diffusion obligatoires."
        }, 400);
      }

      const encryptedKey = await encryptStreamKey(env, streamKey.trim());

      const result = await env.DB.prepare(
        `INSERT INTO destinations
         (user_id, name, platform, server_url, encrypted_stream_key)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(user.id, name, platform, serverUrl, encryptedKey).run();

      return json({
        success: true,
        message: "Destination ajoutée.",
        data: {
          id: result.meta.last_row_id,
          name,
          platform,
          server_url: serverUrl
        }
      }, 201);
    }

    if (method === "PATCH") {
      if (!validId(id)) {
        return json({ success: false, message: "Destination invalide." }, 400);
      }

      const existing = await env.DB.prepare(
        "SELECT * FROM destinations WHERE id = ? AND user_id = ? LIMIT 1"
      ).bind(Number(id), user.id).first();

      if (!existing) {
        return json({ success: false, message: "Destination introuvable." }, 404);
      }

      const newName = name === undefined ? existing.name : name;
      const newPlatform = platform === undefined ? existing.platform : platform;
      const newServerUrl = serverUrl === undefined ? existing.server_url : serverUrl;

      let encryptedKey = existing.encrypted_stream_key;

      if (streamKey !== undefined) {
        if (typeof streamKey !== "string" || !streamKey.trim() || streamKey.length > 2000) {
          return json({ success: false, message: "Clé de diffusion invalide." }, 400);
        }
        encryptedKey = await encryptStreamKey(env, streamKey.trim());
      }

      await env.DB.prepare(
        `UPDATE destinations
         SET name = ?, platform = ?, server_url = ?, encrypted_stream_key = ?
         WHERE id = ? AND user_id = ?`
      ).bind(
        newName,
        newPlatform,
        newServerUrl,
        encryptedKey,
        Number(id),
        user.id
      ).run();

      return json({
        success: true,
        message: "Destination mise à jour.",
        data: {
          id: Number(id),
          name: newName,
          platform: newPlatform,
          server_url: newServerUrl
        }
      });
    }

  } catch (error) {
    if (String(error).includes("MLS_ENCRYPTION_KEY")) {
      return json({
        success: false,
        message: "Configuration de chiffrement manquante ou invalide."
      }, 500);
    }

    return json({
      success: false,
      message: "Une erreur est survenue lors de la gestion des destinations."
    }, 500);
  }
}
