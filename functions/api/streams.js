
export async function onRequestGet({ request, env }) {
  const adminCode = String(
    request.headers.get("x-mls-admin-code") || ""
  ).trim();

  const expectedCode = String(
    env.MLS_ADMIN_CODE || ""
  ).trim();

  if (!expectedCode || !adminCode || adminCode !== expectedCode) {
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
        method: "GET",
        headers: {
          Authorization: "Bearer " + apiKey,
          Accept: "application/json"
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return Response.json({
        success: false,
        message: "Erreur de connexion à Upstream."
      }, { status: 502 });
    }

    function sanitize(value) {
      if (Array.isArray(value)) {
        return value.map(sanitize);
      }

      if (!value || typeof value !== "object") {
        return value;
      }

      const safe = {};

      for (const [key, item] of Object.entries(value)) {
        if (/token|secret|password|credential|bearer|api.?key|stream.?key|url|uri/i.test(key)) {
          continue;
        }

        safe[key] = sanitize(item);
      }

      return safe;
    }

    return Response.json({
      success: true,
      data: sanitize(data),
      message: "Flux récupérés."
    });

  } catch {
    return Response.json({
      success: false,
      message: "Erreur de connexion à Upstream."
    }, { status: 502 });
  }
}
