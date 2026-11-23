import { json, currentUser } from "../../_shared/security.js";

export async function onRequestGet({ request, env }) {
  try {
    const user = await currentUser(request, env);
    if (!user) return json({ success: true, authenticated: false });
    return json({ success: true, authenticated: true, user });
  } catch {
    return json({ success: false, message: "Vérification de session impossible." }, 500);
  }
}
