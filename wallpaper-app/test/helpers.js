// Test-Doubles für die Cloudflare-Bindings.
export class MemoryKV {
  constructor() { this.map = new Map(); }
  async get(key) { const e = this.map.get(key); return e ? (typeof e.value === 'string' ? e.value : null) : null; }
  async put(key, value, opts = {}) { this.map.set(key, { value, metadata: opts.metadata }); }
  async getWithMetadata(key, { type } = {}) {
    const e = this.map.get(key);
    if (!e) return { value: null, metadata: null };
    let value = e.value;
    if (type === 'arrayBuffer') value = value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
    if (type === 'stream') value = new Response(value).body;
    return { value, metadata: e.metadata };
  }
}

// Images-Binding-Double: protokolliert die Kette und liefert die Eingabe unverändert zurück.
export function fakeImages(log) {
  return {
    input(stream) {
      const ops = [];
      const t = {
        transform(o) { ops.push(['transform', o]); return t; },
        draw(_img, o) { ops.push(['draw', o]); return t; },
        async output(o) {
          ops.push(['output', o]);
          log.push(ops);
          return { response: () => new Response(stream, { headers: { 'Content-Type': o.format } }) };
        },
      };
      return t;
    },
  };
}

export const fakeAssets = {
  async fetch(req) {
    const path = new URL(req.url).pathname;
    if (path === '/watermark.png') return new Response(new Uint8Array([1, 2, 3]));
    return new Response('asset', { status: 200 });
  },
};

export function fakeAI(calls) {
  return {
    async run(model, input) {
      calls.push({ model, input });
      return { image: btoa('JPEGDATA') };
    },
  };
}
