import { SlashCommandSubcommandBuilder } from 'discord.js';
import db from '../../lib/db.js';
import { requireArmorer } from '../../lib/permissions.js';
import { successEmbed, errorEmbed, auditEmbed } from '../../lib/embeds.js';
import { logToChannel } from '../../lib/logger.js';

export const builder = new SlashCommandSubcommandBuilder()
  .setName('return')
  .setDescription('Kiadott tárgy visszavétele')
  .addStringOption((o) =>
    o.setName('id').setDescription('Kiadás azonosítója (lásd: /kiadas list)').setRequired(true)
  )
  .addStringOption((o) => o.setName('reason').setDescription('Indoklás').setRequired(false));

export async function execute(interaction) {
  if (!(await requireArmorer(interaction))) return;

  const assignmentId = interaction.options.getString('id');
  const reason = interaction.options.getString('reason');

  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId },
    include: { item: true },
  });

  if (!assignment || assignment.guildId !== interaction.guildId) {
    return interaction.reply({
      embeds: [errorEmbed('Nem található', `\`${assignmentId}\` azonosítójú kiadás nem létezik.`)],
      ephemeral: true,
    });
  }

  if (assignment.returnedAt) {
    return interaction.reply({
      embeds: [errorEmbed('Már visszahozva', 'Ez a kiadás már le van zárva.')],
      ephemeral: true,
    });
  }

  await db.$transaction(async (tx) => {
    await tx.assignment.update({
      where: { id: assignmentId },
      data: { returnedAt: new Date(), returnedTo: interaction.user.id },
    });
    await tx.item.update({
      where: { id: assignment.itemId },
      data: { availableQty: { increment: assignment.qty } },
    });
    await tx.movement.create({
      data: {
        itemId: assignment.itemId,
        type: 'RETURN',
        qty: assignment.qty,
        userId: interaction.user.id,
        reason,
      },
    });
  });

  await interaction.reply({
    embeds: [
      successEmbed(
        'Visszavétel rögzítve',
        `**${assignment.item.name}** × **${assignment.qty} db** visszavéve <@${assignment.userId}>-tól.`
      ),
    ],
  });

  await logToChannel(
    interaction.client,
    auditEmbed({
      action: 'Visszavétel (RETURN)',
      user: interaction.user.id,
      item: `${assignment.item.name} ← <@${assignment.userId}>`,
      qty: assignment.qty,
      reason,
    })
  );
}
