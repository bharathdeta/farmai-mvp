const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const handler = require('../api/chat');
function mock(body) { const req = new EventEmitter(); req.method='POST'; const res={headers:{},setHeader(k,v){this.headers[k]=v},end(v){this.body=JSON.parse(v)}}; queueMicrotask(()=>{req.emit('data',Buffer.from(JSON.stringify(body)));req.emit('end')}); return {req,res}; }
test('rejects empty messages', async()=>{process.env.GEMINI_API_KEY='test';const {req,res}=mock({});await handler(req,res);assert.equal(res.statusCode,400);assert.match(res.body.error,/Write/)});
test('does not attempt a provider call without a key', async()=>{delete process.env.GEMINI_API_KEY;const {req,res}=mock({message:'hello'});await handler(req,res);assert.equal(res.statusCode,503);assert.match(res.body.error,/API key/)});
