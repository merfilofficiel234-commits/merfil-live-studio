
export async function onRequestGet({ request, env }) {
  const adminCode = request.headers.get("x-mls-admin-code");
  const expectedCode = String(env.MLS_ADMIN_CODE || "");

  if (!expectedCode || adminCode !== expectedCode) {
    return Response.json({
      success: false,
      message: "Accès non autorisé."
    }, { status: 401 });
  }

  const apiKey = String(env.UPSTREAM_API_KEY || "")
    .replace(/[\r\n\t]/g, "")
    .trim();

  if (!apiKey) {
    return Response.json({
      success: false,
      message: "Clé Upstream absente."
    }, { status: 500 });
  }

  try {
    const response = await fetch(
      "https://studio.upstream.so/api/v1/streams",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json"
        }
      }
    );

    const data = await response.json();

    return Response.json({
      success: response.ok,
      status: response.status,
      data: response.ok ? data : null,
      message: response.ok
        ? "Flux récupérés."
        : "Erreur Upstream."
    }, { status: response.ok ? 200 : 502 });

  } catch {
    return Response.json({
      success: false,
      message: "Erreur de connexion à Upstream."
    }, { status: 502 });
  }
}
