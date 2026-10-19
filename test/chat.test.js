const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const handler = require('../api/chat');
function mock(body, headers = {}) { const req = new EventEmitter(); req.method='POST'; req.headers=headers; const res={headers:{},setHeader(k,v){this.headers[k]=v},end(v){this.body=JSON.parse(v)}}; queueMicrotask(()=>{req.emit('data',Buffer.from(JSON.stringify(body)));req.emit('end')}); return {req,res}; }
test.beforeEach(() => handler.__resetRateLimitsForTests());
test('rejects empty messages', async()=>{process.env.GEMINI_API_KEY='test';const {req,res}=mock({});await handler(req,res);assert.equal(res.statusCode,400);assert.match(res.body.error,/Write/)});
test('does not attempt a provider call without a key', async()=>{delete process.env.GEMINI_API_KEY;const {req,res}=mock({message:'hello'});await handler(req,res);assert.equal(res.statusCode,503);assert.match(res.body.error,/API key/)});
test('throttles repeated requests from the same forwarded IP', async()=>{process.env.GEMINI_API_KEY='test';process.env.FARMAI_RATE_LIMIT_MAX='2';process.env.FARMAI_RATE_LIMIT_WINDOW_MS='60000';for(let i=0;i<2;i+=1){const {req,res}=mock({}, {'x-forwarded-for':'203.0.113.7'});await handler(req,res);assert.equal(res.statusCode,400);}const {req,res}=mock({}, {'x-forwarded-for':'203.0.113.7'});await handler(req,res);assert.equal(res.statusCode,429);assert.match(res.body.error,/Too many requests/);assert.equal(res.headers['Retry-After'],'60');delete process.env.FARMAI_RATE_LIMIT_MAX;delete process.env.FARMAI_RATE_LIMIT_WINDOW_MS;});
test('rejects unsupported image types before calling the provider', async()=>{process.env.GEMINI_API_KEY='test';const {req,res}=mock({message:'look at this',image:{mimeType:'image/gif',data:'YWJj'}});await handler(req,res);assert.equal(res.statusCode,400);assert.match(res.body.error,/JPG, PNG, or WebP/)});
