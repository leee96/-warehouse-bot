import djs from 'discord.js';
const { SlashCommandSubcommandBuilder, EmbedBuilder } = djs;
import db from '../../lib/db.js';

export const builder = new SlashCommandSubcommandBuilder()
  .setName('my')
  .setDescription('Saját aktív kiadásaim');

export async function execute(interaction) {
  const assignments = await db.assignment.findMany({
    where: {
      guildId: interaction.guildId,
      userId: interaction.user.id,
      returnedAt: null,
    },
    include: { item: true },
    orderBy: { assignedAt: 'desc' },
  });

  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle('📦 Saját kiadásaim')
    .setTimestamp();

  if (assignments.length === 0) {
    embed.setDescription('Jelenleg nincs nálad kiadott tárgy.');
  } else {
    embed.setDescription(
      assignments
        .map(
          (a) =>
            `\`${a.id.slice(-6)}\` **${a.item.name}** × ${a.qty} db — ${new Date(a.assignedAt).toLocaleDateString('hu-HU')}`
        )
        .join('\n')
    );
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
