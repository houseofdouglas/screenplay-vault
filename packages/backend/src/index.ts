import { handle } from 'hono/aws-lambda';
import { createApp } from './app.js';

const app = createApp();

export const handler = handle(app);
