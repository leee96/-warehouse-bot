import { SlashCommandSubcommandBuilder } from 'discord.js';
import db from '../../lib/db.js';
import { requireArmorer } from '../../lib/permissions.js';
import { successEmbed, errorEmbed } from '../../lib/embeds.js';
import { auditEmbed } from '../../lib/embeds.js';
import { logToChannel } from '../../lib/logger.js';

export const builder = new SlashCommandSubcommandBuilder()
  .setName('remove')
  .setDescription('Tárgy archiválása (nem törlés, visszaállítható)')
  .addStringOption((o) =>
    o.setName('name').setDescription('Tárgy neve').setRequired(true).setAutocomplete(true)
  )
  .addStringOption((o) => o.setName('reason').setDescription('Indoklás').setRequired(false));

export async function execute(interaction) {
  if (!(await requireArmorer(interaction))) return;

  const name = interaction.options.getString('name');
  const reason = interaction.options.getString('reason');

  const item = await db.item.findUnique({
    where: { guildId_name: { guildId: interaction.guildId, name } },
  });

  if (!item || item.archived) {
    return interaction.reply({
      embeds: [errorEmbed('Nem található', `**${name}** nevű aktív tárgy nem létezik.`)],
      ephemeral: true,
    });
  }

  await db.item.update({ where: { id: item.id }, data: { archived: true } });

  await interaction.reply({
    embeds: [successEmbed('Tárgy archiválva', `**${item.name}** archiválva.${reason ? ` Indok: ${reason}` : ''}`)],
  });

  await logToChannel(
    interaction.client,
    auditEmbed({ action: 'Tárgy archiválva', user: interaction.user.id, item: item.name, reason })
  );
}

export async function autocomplete(interaction) {
  const focused = interaction.options.getFocused();
  const items = await db.item.findMany({
    where: {
      guildId: interaction.guildId,
      archived: false,
      name: { contains: focused },
    },
    take: 25,
  });
  await interaction.respond(items.map((i) => ({ name: i.name, value: i.name })));
}
