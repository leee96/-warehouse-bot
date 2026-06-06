import { SlashCommandSubcommandBuilder } from 'discord.js';
import db from '../../lib/db.js';
import { requireArmorer } from '../../lib/permissions.js';
import { successEmbed, errorEmbed, auditEmbed } from '../../lib/embeds.js';
import { logToChannel } from '../../lib/logger.js';

export const builder = new SlashCommandSubcommandBuilder()
  .setName('in')
  .setDescription('Készlet növelése (beérkezés)')
  .addStringOption((o) =>
    o.setName('name').setDescription('Tárgy neve').setRequired(true).setAutocomplete(true)
  )
  .addIntegerOption((o) =>
    o.setName('qty').setDescription('Mennyiség').setMinValue(1).setRequired(true)
  )
  .addStringOption((o) => o.setName('reason').setDescription('Indoklás').setRequired(false));

export async function execute(interaction) {
  if (!(await requireArmorer(interaction))) return;

  const name = interaction.options.getString('name');
  const qty = interaction.options.getInteger('qty');
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

  const updated = await db.$transaction(async (tx) => {
    const u = await tx.item.update({
      where: { id: item.id },
      data: { totalQty: { increment: qty }, availableQty: { increment: qty } },
    });
    await tx.movement.create({
      data: { itemId: item.id, type: 'IN', qty, userId: interaction.user.id, reason },
    });
    return u;
  });

  await interaction.reply({
    embeds: [
      successEmbed(
        'Beérkezés rögzítve',
        `**${item.name}** készlete **+${qty} db**.\nElérhető: **${updated.availableQty} db** / Összesen: **${updated.totalQty} db**`
      ),
    ],
  });

  await logToChannel(
    interaction.client,
    auditEmbed({ action: 'Beérkezés (IN)', user: interaction.user.id, item: item.name, qty, reason }),
    interaction.guildId
  );
}

export async function autocomplete(interaction) {
  const focused = interaction.options.getFocused();
  const items = await db.item.findMany({
    where: { guildId: interaction.guildId, archived: false, name: { contains: focused } },
    take: 25,
  });
  await interaction.respond(items.map((i) => ({ name: i.name, value: i.name })));
}
