import Link from 'next/link';

export default function DocsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">CurrencyIQ API Reference</h1>
      <p className="text-gray-500 mb-8">A free, fast, and reliable currency conversion API with 160+ currencies.</p>

      {/* Auth */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Authentication</h2>
        <div className="bg-white border border-gray-200 rounded-xl p-5 text-sm text-gray-700 space-y-3">
          <p>Pass your API key in the <code className="bg-gray-100 px-1 rounded">x-api-key</code> header or as a query parameter <code className="bg-gray-100 px-1 rounded">?api_key=your_key</code>.</p>
          <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-x-auto">{`curl https://localhost:3001/api/v1/rates/convert?from=USD&to=NGN&amount=100 \\
  -H "x-api-key: ciq_yourkeyhere"`}</pre>
          <p className="text-gray-500">Without an API key, requests are rate-limited by IP. <Link href="/register" className="text-blue-600 hover:underline">Get a free key →</Link></p>
        </div>
      </section>

      {/* Rate Limits */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Rate Limits</h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Endpoint</th>
                <th className="px-4 py-3">API Key</th>
                <th className="px-4 py-3">IP (no key)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                ['GET /rates, /convert', '500/hour', '30/hour'],
                ['GET /rates/convert/multi', '200/hour', '10/hour'],
                ['POST /rates/refresh', '5/day', '1/day'],
                ['GET /rates/history', '200/hour', '10/hour'],
                ['GET /currencies', 'Unlimited', '50/hour'],
              ].map(([ep, key, ip]) => (
                <tr key={ep} className="bg-white">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{ep}</td>
                  <td className="px-4 py-3 text-green-600 font-medium">{key}</td>
                  <td className="px-4 py-3 text-orange-500">{ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Endpoints */}
      <section className="mb-10 space-y-6">
        <h2 className="text-xl font-semibold text-gray-800">Endpoints</h2>

        {[
          {
            method: 'GET', path: '/api/v1/rates/convert',
            desc: 'Convert between two currencies',
            params: '?from=USD&to=NGN&amount=100',
            example: `{ "success": true, "data": { "from": "USD", "to": "NGN", "amount": 100, "result": 150200, "rate": 1502 } }`,
          },
          {
            method: 'GET', path: '/api/v1/rates/convert/multi',
            desc: 'Convert to multiple currencies at once',
            params: '?from=USD&to=NGN,GBP,EUR&amount=100',
            example: `{ "success": true, "data": { "from": "USD", "amount": 100, "conversions": [...] } }`,
          },
          {
            method: 'GET', path: '/api/v1/rates',
            desc: 'Get all exchange rates for a base currency',
            params: '?base=USD',
            example: `{ "success": true, "data": { "rates": { "NGN": 1502, "EUR": 0.92, ... } } }`,
          },
          {
            method: 'POST', path: '/api/v1/rates/refresh',
            desc: 'Force-refresh rates for a pair (benefits all users)',
            params: 'body: { "from": "USD", "to": "NGN" }',
            example: `{ "success": true, "data": { "fresh": true } }`,
          },
          {
            method: 'GET', path: '/api/v1/rates/history',
            desc: 'Historical rates for a currency pair',
            params: '?from=USD&to=NGN&period=7d',
            example: `{ "success": true, "data": { "data": [{ "date": "2026-04-20", "rate": 1498 }, ...] } }`,
          },
          {
            method: 'GET', path: '/api/v1/currencies',
            desc: 'List all supported currencies',
            params: '?search=nig (optional)',
            example: `{ "success": true, "data": [{ "code": "NGN", "name": "Nigerian Naira", "symbol": "₦" }] }`,
          },
          {
            method: 'GET', path: '/api/v1/currencies/:code',
            desc: 'Full metadata for one currency',
            params: '/api/v1/currencies/NGN',
            example: `{ "success": true, "data": { "code": "NGN", "name": "Nigerian Naira", "central_bank": "CBN", ... } }`,
          },
        ].map(({ method, path, desc, params, example }) => (
          <div key={path} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
              <span className={`text-xs font-bold px-2 py-1 rounded ${method === 'GET' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{method}</span>
              <code className="text-sm font-mono text-gray-800">{path}</code>
            </div>
            <div className="px-5 py-4 space-y-3 text-sm">
              <p className="text-gray-600">{desc}</p>
              <div><span className="text-xs font-medium text-gray-400">PARAMS: </span><code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{params}</code></div>
              <pre className="bg-gray-900 text-green-400 text-xs rounded-lg p-3 overflow-x-auto">{example}</pre>
            </div>
          </div>
        ))}
      </section>

      {/* Code examples */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Code Examples</h2>
        <div className="space-y-4">
          {[
            {
              lang: 'cURL',
              code: `curl "http://localhost:3001/api/v1/rates/convert?from=USD&to=NGN&amount=100" \\
  -H "x-api-key: ciq_yourkeyhere"`,
            },
            {
              lang: 'JavaScript (fetch)',
              code: `const res = await fetch(
  'http://localhost:3001/api/v1/rates/convert?from=USD&to=NGN&amount=100',
  { headers: { 'x-api-key': 'ciq_yourkeyhere' } }
);
const { data } = await res.json();
console.log(\`\${data.amount} USD = \${data.result} NGN\`);`,
            },
            {
              lang: 'Python',
              code: `import requests

res = requests.get(
    'http://localhost:3001/api/v1/rates/convert',
    params={'from': 'USD', 'to': 'NGN', 'amount': 100},
    headers={'x-api-key': 'ciq_yourkeyhere'}
)
data = res.json()['data']
print(f"{data['amount']} USD = {data['result']} NGN")`,
            },
          ].map(({ lang, code }) => (
            <div key={lang} className="rounded-xl overflow-hidden border border-gray-200">
              <div className="bg-gray-800 px-4 py-2 text-xs font-medium text-gray-400">{lang}</div>
              <pre className="bg-gray-900 text-green-400 text-xs p-4 overflow-x-auto">{code}</pre>
            </div>
          ))}
        </div>
      </section>

      <div className="text-center">
        <Link href="/register" className="bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 transition">
          Get Your Free API Key
        </Link>
      </div>
    </div>
  );
}
