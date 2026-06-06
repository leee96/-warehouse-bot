import { SlashCommandSubcommandBuilder, EmbedBuilder } from 'discord.js';
import db from '../../lib/db.js';
import { errorEmbed } from '../../lib/embeds.js';

export const builder = new SlashCommandSubcommandBuilder()
  .setName('search')
  .setDescription('Tárgy keresése névtöredék alapján')
  .addStringOption((o) =>
    o.setName('query').setDescription('Keresési kifejezés').setRequired(true)
  );

export async function execute(interaction) {
  const query = interaction.options.getString('query');

  const items = await db.item.findMany({
    where: {
      guildId: interaction.guildId,
      archived: false,
      name: { contains: query, mode: 'insensitive' },
    },
    orderBy: { name: 'asc' },
    take: 25,
  });

  if (items.length === 0) {
    return interaction.reply({
      embeds: [errorEmbed('Nincs találat', `**"${query}"** kifejezésre nincs eredmény.`)],
      ephemeral: true,
    });
  }

  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle(`🔍 Keresési eredmények: "${query}"`)
    .setDescription(
      items
        .map(
          (i) =>
            `**${i.name}** — ${i.availableQty}/${i.totalQty} db${i.category ? ` *(${i.category})*` : ''}`
        )
        .join('\n')
    );

  await interaction.reply({ embeds: [embed] });
}
