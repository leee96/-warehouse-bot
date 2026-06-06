import djs from 'discord.js';
const { SlashCommandSubcommandBuilder } = djs;
import db from '../../lib/db.js';
import { successEmbed, errorEmbed, auditEmbed } from '../../lib/embeds.js';
import { logToChannel } from '../../lib/logger.js';

export const builder = new SlashCommandSubcommandBuilder()
  .setName('return')
  .setDescription('Kiadott tárgy visszavétele')
  .addStringOption((o) =>
    o.setName('id').setDescription('Kiadás azonosítója (lásd: /kiadas list)').setRequired(true)
  )
  .addStringOption((o) => o.setName('reason').setDescription('Indoklás').setRequired(false));

async function isArmorer(interaction) {
  const config = await db.config.findUnique({ where: { guildId: interaction.guildId } });
  if (!config?.armorRoleId) return false;
  return interaction.member.roles.cache.has(config.armorRoleId) || interaction.member.permissions.has('Administrator');
}

export async function execute(interaction) {
  const shortId = interaction.options.getString('id').trim();
  const reason = interaction.options.getString('reason');

  // Validate: must be 6-25 alphanumeric chars to prevent endsWith('') matching everything
  if (!/^[a-z0-9]{6,25}$/i.test(shortId)) {
    return interaction.reply({
      embeds: [errorEmbed('Érvénytelen azonosító', 'Az azonosító 6-25 alfanumerikus karakter lehet.')],
      ephemeral: true,
    });
  }

  const assignment = await db.assignment.findFirst({
    where: { id: { endsWith: shortId }, guildId: interaction.guildId },
    include: { item: true },
  });

  if (!assignment) {
    return interaction.reply({
      embeds: [errorEmbed('Nem található', `\`${shortId}\` azonosítójú kiadás nem létezik.`)],
      ephemeral: true,
    });
  }

  const armorer = await isArmorer(interaction);
  if (!armorer && assignment.userId !== interaction.user.id) {
    return interaction.reply({
      embeds: [errorEmbed('Nincs jogosultságod', 'Csak a saját kiadásodat adhatod vissza.')],
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
      where: { id: assignment.id },
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
    }),
    interaction.guildId
  );
}
