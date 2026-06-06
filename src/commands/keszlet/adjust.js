import { SlashCommandSubcommandBuilder } from 'discord.js';
import db from '../../lib/db.js';
import { requireArmorer } from '../../lib/permissions.js';
import { successEmbed, errorEmbed, auditEmbed } from '../../lib/embeds.js';
import { logToChannel } from '../../lib/logger.js';

export const builder = new SlashCommandSubcommandBuilder()
  .setName('adjust')
  .setDescription('Készlet manuális kiigazítása (pontos értékre állítás)')
  .addStringOption((o) =>
    o.setName('name').setDescription('Tárgy neve').setRequired(true).setAutocomplete(true)
  )
  .addIntegerOption((o) =>
    o.setName('qty').setDescription('Új elérhető mennyiség').setMinValue(0).setRequired(true)
  )
  .addStringOption((o) => o.setName('reason').setDescription('Indoklás').setRequired(false));

export async function execute(interaction) {
  if (!(await requireArmorer(interaction))) return;

  const name = interaction.options.getString('name');
  const newQty = interaction.options.getInteger('qty');
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

  const delta = newQty - item.availableQty;
  const newTotal = item.totalQty + delta;

  const updated = await db.$transaction(async (tx) => {
    const u = await tx.item.update({
      where: { id: item.id },
      data: { availableQty: newQty, totalQty: newTotal },
    });
    await tx.movement.create({
      data: {
        itemId: item.id,
        type: 'ADJUST',
        qty: Math.abs(delta),
        delta,
        userId: interaction.user.id,
        reason,
      },
    });
    return u;
  });

  const sign = delta >= 0 ? `+${delta}` : String(delta);
  await interaction.reply({
    embeds: [
      successEmbed(
        'Kiigazítás rögzítve',
        `**${item.name}** elérhető készlet: **${updated.availableQty} db** (változás: ${sign} db)\nÖsszesen: **${updated.totalQty} db**`
      ),
    ],
  });

  await logToChannel(
    interaction.client,
    auditEmbed({
      action: 'Kiigazítás (ADJUST)',
      user: interaction.user.id,
      item: item.name,
      qty: Math.abs(delta),
      reason,
    }),
    interaction.guildId
  );
}

export async function autocomplete(interaction) {
  const focused = interaction.options.getFocused();
  const items = await db.item.findMany({
    where: { guildId: interaction.guildId, archived: false, name: { contains: focused } },
    take: 25,
  });
  await interaction.respond(items.map((i) => ({ name: `${i.name} (${i.availableQty} db)`, value: i.name })));
}
