#!/usr/bin/env node

const harness = process.env.AGENT_HARNESS || 'claude';
const now = new Date().toISOString();

console.log(`pi.dev press-play: hello from the ${harness} harness`);
console.log(`run ts: ${now}`);
