export async function onRequestGet(context) {
  const env = context.env || {};

  return Response.json({
    functionRunning: true,
    secretDetected: Object.prototype.hasOwnProperty.call(
      env,
      "UPSTREAM_API_KEY"
    ),
    availableNames: Object.keys(env)
  });
}