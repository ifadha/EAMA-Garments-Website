/* Compatibility bridge for the existing form markup while PHP endpoints are removed. */
(() => {
  const nativeFetch = window.fetch.bind(window);
  const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  window.fetch = async (input, init = {}) => {
    const url = String(input);
    if (!url.includes('admin/api.php?route=')) return nativeFetch(input, init);
    try {
      const route = url.split('route=')[1];
      if (route === 'public/slots') {
        const { data, error } = await eamaSupabase.from('factory_slots').select('id,starts_at,ends_at').eq('status', 'available').gt('starts_at', new Date().toISOString()).order('starts_at');
        if (error) throw error; return jsonResponse({ slots: data });
      }
      if (route === 'public/submit') {
        const payload = init.body instanceof FormData ? Object.fromEntries(init.body.entries()) : JSON.parse(init.body || '{}');
        const files = init.body instanceof FormData ? [...init.body.getAll('files[]')] : [];
        const request = await eamaSubmitRequest(payload, files);
        return jsonResponse({ success: true, requestId: request.id, requestNumber: request.request_number });
      }
      return jsonResponse({ error: 'This endpoint is now handled directly by Supabase.' }, 404);
    } catch (error) { return jsonResponse({ error: error.message || 'Supabase request failed.' }, 500); }
  };
})();
