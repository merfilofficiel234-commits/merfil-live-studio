
export async function onRequestGet({ env }) {
  const apiKey = String(env.UPSTREAM_API_KEY || "")
    .replace(/\s+/g, "");

  if (!apiKey) {
    return Response.json({
      success: false,
      message: "Clé API absente."
    }, { status: 500 });
  }

  try {
    const response = await fetch(
      "https://studio.upstream.so/api/v1/user",
      {
        method: "GET",
        headers: {
          Authorization: "Bearer " + apiKey,
          Accept: "application/json"
        }
      }
    );

    return Response.json({
      success: response.ok,
      upstreamStatus: response.status,
      message: response.ok
        ? "Connexion à Upstream réussie."
        : "Upstream a refusé la connexion."
    }, { status: response.ok ? 200 : 502 });

  } catch (error) {
    return Response.json({
      success: false,
      message: "Erreur de connexion.",
      detail: error.message
    }, { status: 502 });
  }
}