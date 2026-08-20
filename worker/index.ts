import { handleTasks } from './tasks.js';
import { jsonError } from './storage.js';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (!url.pathname.startsWith('/api/')) {
      return new Response(null, { status: 404 });
    }

    const segments = url.pathname.slice('/api/'.length).split('/').filter(Boolean);
    const [resource] = segments;
    const method = request.method;

    if (resource === 'tasks') {
      return handleTasks(request, env, segments, method);
    }

    return jsonError('Không tìm thấy API', 404);
  },
} satisfies ExportedHandler<Env>;