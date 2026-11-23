export async function onRequest() {
  return Response.json({
    success: false,
    message: "Cette ancienne route est désactivée."
  }, { status: 410 });
}