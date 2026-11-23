
export async function onRequestGet({ env }) {
  if (!env.UPSTREAM_API_KEY) {
    return Response.json({
      success: false,
      message: "UPSTREAM_API_KEY introuvable dans Cloudflare."
    }, { status: 500 });
  }

  try {
    const response = await fetch(
      "https://studio.upstream.so/api/v1/user",
      {
        headers: {
          Authorization: `Bearer ${env.UPSTREAM_API_KEY}`,
          Accept: "application/json"
        }
      }
    );

    return Response.json({
      success: response.ok,
      upstreamStatus: response.status,
      message: response.ok
        ? "Connexion à Upstream réussie."
        : "Upstream a répondu avec une erreur."
    }, { status: response.ok ? 200 : 502 });

  } catch (error) {
    return Response.json({
      success: false,
      message: "Échec de la requête.",
      detail: error instanceof Error ? error.message : "Erreur inconnue"
    }, { status: 502 });
  }
}
