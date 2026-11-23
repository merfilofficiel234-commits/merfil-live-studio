export async function onRequestGet({ env }) {
  const apiKey = String(env.UPSTREAM_API_KEY || "")
    .replace(/\s+/g, "");

  if (!apiKey) {
    return Response.json({
      success: false,
      message: "Clé API absente"
    });
  }

  try {
    const response = await fetch(
      "https://studio.upstream.so/api/v1/user",
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Accept": "application/json"
        }
      }
    );

    const details = await response.text();

    return Response.json({
      success: response.ok,
      status: response.status,
      keyLength: apiKey.length,
      upstreamResponse: details
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    });
  }
}
