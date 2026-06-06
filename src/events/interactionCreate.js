import { logger } from '../lib/logger.js';
import db from '../lib/db.js';
import { EmbedBuilder } from 'discord.js';
import { buildPaginationRow, PAGE_SIZE } from '../lib/pagination.js';
import { checkCooldown } from '../lib/ratelimit.js';
import { errorEmbed } from '../lib/embeds.js';

// Write commands that are subject to per-user rate limiting
const WRITE_COMMANDS = new Set([
  'targy:add', 'targy:edit', 'targy:remove',
  'keszlet:in', 'keszlet:out', 'keszlet:adjust',
  'kiadas:new', 'kiadas:return',
]);

export const name = 'interactionCreate';

export async function execute(interaction, commands) {
  // S-02: reject all interactions outside a guild (DMs, group DMs)
  if (!interaction.guildId) return;

  if (interaction.isChatInputCommand()) {
    const command = commands.get(interaction.commandName);
    if (!command) return;

    try {
      // Rate limit write commands per user
      const subcommand = interaction.options.getSubcommand(false);
      const cmdKey = subcommand ? `${interaction.commandName}:${subcommand}` : interaction.commandName;
      if (WRITE_COMMANDS.has(cmdKey)) {
        const { limited, remainingMs } = checkCooldown(interaction.user.id, cmdKey);
        if (limited) {
          return interaction.reply({
            embeds: [errorEmbed('Lassíts!', `Várj még **${(remainingMs / 1000).toFixed(1)} mp**-et a következő parancs előtt.`)],
            ephemeral: true,
          });
        }
      }

      const result = await command.execute(interaction);
      // Commands that return a payload (e.g. list) need to be replied here
      if (result && !interaction.replied && !interaction.deferred) {
        await interaction.reply(result);
      }
    } catch (err) {
      logger.error({ err, command: interaction.commandName }, 'Command error');
      const msg = { content: 'Belső hiba történt. Kérlek próbáld újra.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg).catch(() => {});
      } else {
        await interaction.reply(msg).catch(() => {});
      }
    }
    return;
  }

  if (interaction.isAutocomplete()) {
    const command = commands.get(interaction.commandName);
    if (!command?.autocomplete) return;

    try {
      await command.autocomplete(interaction);
    } catch (err) {
      logger.error({ err, command: interaction.commandName }, 'Autocomplete error');
    }
    return;
  }

  // B-02 fix: pagination buttons actually re-query and update the message
  if (interaction.isButton()) {
    const parts = interaction.customId.split('_');
    if (parts[0] !== 'page' || parts[1] === 'info') return;

    const direction = parts[1];
    const currentPage = parseInt(parts[2], 10);
    const listType = parts[3];
    const newPage = direction === 'next' ? currentPage + 1 : currentPage - 1;

    await interaction.deferUpdate();

    try {
      if (listType === 'targy') {
        const { execute: listExecute } = await import('../commands/targy/list.js');
        const payload = await listExecute(
          { guildId: interaction.guildId, options: { getString: () => null, getInteger: () => null } },
          newPage
        );
        await interaction.editReply(payload);
      }
    } catch (err) {
      logger.error({ err, listType, newPage }, 'Pagination button error');
    }
  }
}
