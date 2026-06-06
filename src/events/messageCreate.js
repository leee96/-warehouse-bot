import { buildHelpEmbed } from '../commands/help.js';
import { logger } from '../lib/logger.js';

const PREFIX = '!';

export const name = 'messageCreate';

export async function execute(message) {
  if (message.author.bot || !message.guild) return;
  if (!message.content.startsWith(PREFIX)) return;

  const cmd = message.content.slice(PREFIX.length).trim().split(/\s+/)[0].toLowerCase();

  if (cmd === 'help') {
    await message.reply({ embeds: [buildHelpEmbed()] });
  }
}
