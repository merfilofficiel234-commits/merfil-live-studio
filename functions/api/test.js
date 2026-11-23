
export async function onRequestGet({ env }) {
  if (!env.UPSTREAM_API_KEY) {
    return Response.json(
      { success: false, message: "Clé API non configurée." },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      "https://studio.upstream.so/api/v1/user",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${env.UPSTREAM_API_KEY}`,
          Accept: "application/json"
        }
      }
    );

    if (!response.ok) {
      return Response.json(
        {
          success: false,
          message: "Connexion Upstream refusée.",
          upstreamStatus: response.status
        },
        { status: 502 }
      );
    }

    return Response.json({
      success: true,
      message: "Connexion à Upstream réussie."
    });
  } catch {
    return Response.json(
      { success: false, message: "Erreur de connexion." },
      { status: 500 }
    );
  }
}
