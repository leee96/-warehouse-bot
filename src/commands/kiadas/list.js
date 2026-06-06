import djs from 'discord.js';
const { SlashCommandSubcommandBuilder, EmbedBuilder } = djs;
import db from '../../lib/db.js';
import { requireArmorer } from '../../lib/permissions.js';

export const builder = new SlashCommandSubcommandBuilder()
  .setName('list')
  .setDescription('Aktív kiadások listája')
  .addUserOption((o) =>
    o.setName('user').setDescription('Szűrés felhasználóra').setRequired(false)
  );

export async function execute(interaction) {
  if (!(await requireArmorer(interaction))) return;

  const targetUser = interaction.options.getUser('user');

  const assignments = await db.assignment.findMany({
    where: {
      guildId: interaction.guildId,
      returnedAt: null,
      ...(targetUser ? { userId: targetUser.id } : {}),
    },
    include: { item: true },
    orderBy: { assignedAt: 'desc' },
    take: 25,
  });

  const embed = new EmbedBuilder()
    .setColor(0xf39c12)
    .setTitle(`📤 Aktív kiadások${targetUser ? ` — ${targetUser.displayName}` : ''}`)
    .setTimestamp();

  if (assignments.length === 0) {
    embed.setDescription('Nincs aktív kiadás.');
  } else {
    embed.setDescription(
      assignments
        .map(
          (a) =>
            `\`${a.id.slice(-8)}\` **${a.item.name}** × ${a.qty} db — <@${a.userId}> (${new Date(a.assignedAt).toLocaleDateString('hu-HU')})`
        )
        .join('\n')
    );
  }

  await interaction.reply({ embeds: [embed], ephemeral: false });
}
