
export async function onRequestGet({ env }) {
  const apiKey = String(env.UPSTREAM_API_KEY || "").trim();

  if (!apiKey) {
    return Response.json({
      success: false,
      message: "Variable UPSTREAM_API_KEY absente."
    });
  }

  try {
    const response = await fetch(
      "https://studio.upstream.so/api/v1/user",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json"
        }
      }
    );

    return Response.json({
      success: response.ok,
      status: response.status,
      message: response.ok
        ? "Connexion Upstream réussie !"
        : "Upstream refuse la clé API."
    });

  } catch (error) {
    return Response.json({
      success: false,
      message: "Erreur de connexion.",
      detail: error.message
    });
  }
}
