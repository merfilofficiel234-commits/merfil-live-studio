import { json, cookieValue, sha256, sessionCookie, validOrigin } from "../../_shared/security.js";

export async function onRequestPost({ request, env }) {
  if (!validOrigin(request)) {
    return json({ success: false, message: "Origine refusée." }, 403);
  }

  const token = cookieValue(request, "mls_session");

  if (token && env.DB) {
    const tokenHash = await sha256(token);

    await env.DB.prepare(
      "DELETE FROM sessions WHERE token_hash = ?"
    ).bind(tokenHash).run();
  }

  return json(
    { success: true, message: "Déconnexion réussie." },
    200,
    { "Set-Cookie": sessionCookie("", 0) }
  );
}