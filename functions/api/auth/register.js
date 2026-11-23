import { json, hashPassword, createSession, sessionCookie, validOrigin } from "../../_shared/security.js";

export async function onRequestPost({ request, env }) {
  if (!validOrigin(request)) return json({ success: false, message: "Origine refusée." }, 403);
  if (!env.DB) return json({ success: false, message: "Base de données non configurée." }, 500);

  let body;
  try { body = await request.json(); } catch { return json({ success: false, message: "Données invalides." }, 400); }

  const username = String(body.username || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (username.length < 2 || username.length > 40) {
    return json({ success: false, message: "Le nom doit contenir entre 2 et 40 caractères." }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 190) {
    return json({ success: false, message: "Adresse e-mail invalide." }, 400);
  }
  if (password.length < 12 || password.length > 200) {
    return json({ success: false, message: "Le mot de passe doit contenir au moins 12 caractères." }, 400);
  }

  try {
    const passwordHash = await hashPassword(password);
    const result = await env.DB.prepare(
      "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)"
    ).bind(username, email, passwordHash).run();

    const userId = result.meta.last_row_id;
    const token = await createSession(env, userId);
    return json(
      { success: true, user: { id: userId, username, email } },
      201,
      { "Set-Cookie": sessionCookie(token) }
    );
  } catch (error) {
    if (String(error).includes("UNIQUE")) {
      return json({ success: false, message: "Cette adresse e-mail possède déjà un compte." }, 409);
    }
    return json({ success: false, message: "Impossible de créer le compte pour le moment." }, 500);
  }
}
