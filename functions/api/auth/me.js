import { json, currentUser } from "../../_shared/security.js";

export async function onRequestGet({ request, env }) {
  if (!env.DB) {
    return json({
      success: false,
      message: "Base de données non configurée."
    }, 500);
  }

  try {
    const user = await currentUser(request, env);

    if (!user) {
      return json({
        success: false,
        message: "Utilisateur non connecté."
      }, 401);
    }

    return json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch {
    return json({
      success: false,
      message: "Impossible de vérifier la session."
    }, 500);
  }
}