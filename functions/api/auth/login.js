import { json, verifyPassword, createSession, sessionCookie, validOrigin } from "../../_shared/security.js";

export async function onRequestPost({ request, env }) {
  if (!validOrigin(request)) return json({ success: false, message: "Origine refusée." }, 403);
  if (!env.DB) return json({ success: false, message: "Base de données non configurée." }, 500);

  let body;
  try { body = await request.json(); } catch { return json({ success: false, message: "Données invalides." }, 400); }

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!email || !password) return json({ success: false, message: "E-mail et mot de passe obligatoires." }, 400);

  try {
    const user = await env.DB.prepare(
      "SELECT id, username, email, password_hash FROM users WHERE email = ? LIMIT 1"
    ).bind(email).first();

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return json({ success: false, message: "E-mail ou mot de passe incorrect." }, 401);
    }

    const token = await createSession(env, user.id);
    return json(
      { success: true, user: { id: user.id, username: user.username, email: user.email } },
      200,
      { "Set-Cookie": sessionCookie(token) }
    );
  } catch {
    return json({ success: false, message: "Connexion impossible pour le moment." }, 500);
  }
}
