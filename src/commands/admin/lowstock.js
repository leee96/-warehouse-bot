import { SlashCommandSubcommandBuilder, EmbedBuilder } from 'discord.js';
import db from '../../lib/db.js';
import { requireArmorer } from '../../lib/permissions.js';

export const builder = new SlashCommandSubcommandBuilder()
  .setName('lowstock')
  .setDescription('Minimum készlet alatti tárgyak listája');

export async function execute(interaction) {
  if (!(await requireArmorer(interaction))) return;

  const items = await db.item.findMany({
    where: {
      guildId: interaction.guildId,
      archived: false,
      minStock: { gt: 0 },
    },
    orderBy: { name: 'asc' },
  });

  const lowItems = items.filter((i) => i.availableQty <= i.minStock);

  const embed = new EmbedBuilder().setColor(0xe74c3c).setTitle('⚠️ Alacsony készlet').setTimestamp();

  if (lowItems.length === 0) {
    embed.setColor(0x2ecc71).setDescription('Minden tárgy készlete a minimum felett van.');
  } else {
    embed.setDescription(
      lowItems
        .map(
          (i) =>
            `**${i.name}** — ${i.availableQty}/${i.totalQty} db (min: ${i.minStock})${i.category ? ` *(${i.category})*` : ''}`
        )
        .join('\n')
    );
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
