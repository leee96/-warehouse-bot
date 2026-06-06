import { logger } from '../lib/logger.js';

export const name = 'interactionCreate';

export async function execute(interaction, commands) {
  if (interaction.isChatInputCommand()) {
    const command = commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
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

  if (interaction.isButton()) {
    const [action, direction, pageStr] = interaction.customId.split('_');
    if (action !== 'page') return;

    const page = parseInt(pageStr, 10);
    const newPage = direction === 'next' ? page + 1 : page - 1;

    // Re-run the original list command with the new page — reconstruct via stored state
    await interaction.deferUpdate();
    // Pagination is handled by re-running the command with updated page option
    // This is a simple acknowledge; the user can run /targy list page:<n>
    logger.debug({ newPage }, 'Pagination button pressed');
  }
}
