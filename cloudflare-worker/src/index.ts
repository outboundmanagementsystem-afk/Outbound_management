interface Env {
  MY_BUCKET: R2Bucket;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Cache-Control',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const key = url.pathname.slice(1); // remove leading slash

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (!key) {
      return new Response('Key is required', { status: 400, headers: corsHeaders });
    }

    switch (request.method) {
      case 'PUT':
        await env.MY_BUCKET.put(key, request.body, {
          httpMetadata: { contentType: request.headers.get('content-type') || 'application/octet-stream' },
        });
        return new Response(`Put ${key} successfully!`, { headers: corsHeaders });

      case 'GET':
        const object = await env.MY_BUCKET.get(key);
        if (object === null) {
          return new Response('Object Not Found', { status: 404, headers: corsHeaders });
        }
        const headers = new Headers(corsHeaders);
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        return new Response(object.body as ReadableStream, { headers });

      default:
        return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
    }
  },
};
