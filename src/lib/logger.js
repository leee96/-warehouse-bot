import pino from 'pino';
import db from './db.js';

export const logger = pino({
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  level: process.env.LOG_LEVEL ?? 'info',
});

// B-01 fix: guildId param — only log to the guild where the action happened
// B-09 fix: static db import instead of dynamic import() on every call
export async function logToChannel(client, embed, guildId) {
  try {
    const config = await db.config.findUnique({ where: { guildId } });
    if (!config?.logChannelId) return;

    const channel = await client.channels.fetch(config.logChannelId).catch(() => null);
    if (channel?.isTextBased()) {
      await channel.send({ embeds: [embed] });
    }
  } catch (err) {
    logger.error({ err }, 'logToChannel failed');
  }
}
