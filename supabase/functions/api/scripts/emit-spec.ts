import { createApp } from '../app.ts';

const app = createApp();
const doc = app.getOpenAPIDocument({
  openapi: '3.0.0',
  info: { title: 'Pear API', version: '1.0.0' },
});

console.log(JSON.stringify(doc, null, 2));
