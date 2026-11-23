
export async function onRequestGet({ env }) {
  const key = String(env.UPSTREAM_API_KEY || "");

  return Response.json({
    functionRunning: true,
    secretDetected: Boolean(key),
    keyLength: key.length,
    hasLineBreak: /[\r\n]/.test(key),
    hasOuterSpaces: key !== key.trim()
  });
}
