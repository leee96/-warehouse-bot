import pino from 'pino';

export const logger = pino({
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  level: process.env.LOG_LEVEL ?? 'info',
});

export async function logToChannel(client, embed) {
  try {
    const configs = await import('./db.js').then((m) =>
      m.default.config.findMany({ where: { logChannelId: { not: null } } })
    );
    for (const config of configs) {
      if (!config.logChannelId) continue;
      const channel = await client.channels.fetch(config.logChannelId).catch(() => null);
      if (channel?.isTextBased()) {
        await channel.send({ embeds: [embed] });
      }
    }
  } catch (err) {
    logger.error({ err }, 'logToChannel failed');
  }
}
