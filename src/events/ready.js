import { logger } from '../lib/logger.js';

export const name = 'ready';
export const once = true;

export async function execute(client) {
  logger.info(`Bot online: ${client.user.tag}`);
}
