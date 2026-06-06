import djs from 'discord.js';
const { SlashCommandSubcommandBuilder } = djs;
import db from '../../lib/db.js';
import { requireArmorer } from '../../lib/permissions.js';
import { successEmbed, errorEmbed, auditEmbed } from '../../lib/embeds.js'; // B-03 fix: merged imports
import { itemAddSchema } from '../../lib/validators.js';
import { logToChannel } from '../../lib/logger.js';

export const builder = new SlashCommandSubcommandBuilder()
  .setName('add')
  .setDescription('Új tárgy hozzáadása a raktárhoz')
  .addStringOption((o) => o.setName('name').setDescription('Tárgy neve').setRequired(true))
  .addIntegerOption((o) =>
    o.setName('qty').setDescription('Kezdő mennyiség').setMinValue(0).setRequired(false)
  )
  .addStringOption((o) => o.setName('category').setDescription('Kategória').setRequired(false))
  .addIntegerOption((o) =>
    o
      .setName('minstock')
      .setDescription('Minimum készlet (figyelmeztetési határ)')
      .setMinValue(0)
      .setRequired(false)
  );

export async function execute(interaction) {
  if (!(await requireArmorer(interaction))) return;

  const raw = {
    name: interaction.options.getString('name'),
    qty: interaction.options.getInteger('qty') ?? 0,
    category: interaction.options.getString('category') ?? undefined,
    minstock: interaction.options.getInteger('minstock') ?? 0,
  };

  const parsed = itemAddSchema.safeParse(raw);
  if (!parsed.success) {
    return interaction.reply({
      embeds: [errorEmbed('Érvénytelen adatok', parsed.error.issues.map((i) => i.message).join('\n'))],
      ephemeral: true,
    });
  }

  const existing = await db.item.findUnique({
    where: { guildId_name: { guildId: interaction.guildId, name: parsed.data.name } },
    include: { assignments: { where: { returnedAt: null } } },
  });

  if (existing && !existing.archived) {
    return interaction.reply({
      embeds: [errorEmbed('Már létezik', `**${parsed.data.name}** nevű tárgy már szerepel a raktárban.`)],
      ephemeral: true,
    });
  }

  // B-05 fix: when unarchiving, respect existing active assignments
  // availableQty = new qty - still-active assigned qty
  const activeAssignedQty = existing?.assignments.reduce((sum, a) => sum + a.qty, 0) ?? 0;
  const newAvailableQty = Math.max(0, parsed.data.qty - activeAssignedQty);
  const newTotalQty = parsed.data.qty;

  // B-04 fix: upsert + movement in one transaction
  const item = await db.$transaction(async (tx) => {
    const i = await tx.item.upsert({
      where: { guildId_name: { guildId: interaction.guildId, name: parsed.data.name } },
      create: {
        guildId: interaction.guildId,
        name: parsed.data.name,
        category: parsed.data.category ?? null,
        totalQty: newTotalQty,
        availableQty: newAvailableQty,
        minStock: parsed.data.minstock,
      },
      update: {
        archived: false,
        category: parsed.data.category ?? null,
        totalQty: newTotalQty,
        availableQty: newAvailableQty,
        minStock: parsed.data.minstock,
      },
    });

    if (parsed.data.qty > 0) {
      await tx.movement.create({
        data: {
          itemId: i.id,
          type: 'IN',
          qty: parsed.data.qty,
          userId: interaction.user.id,
          reason: existing ? 'Visszaállítás / új kezdőkészlet' : 'Kezdő készlet',
        },
      });
    }

    return i;
  });

  await interaction.reply({
    embeds: [
      successEmbed(
        'Tárgy hozzáadva',
        `**${item.name}** sikeresen rögzítve.\nElérhető: **${item.availableQty} db** / Összesen: **${item.totalQty} db**${parsed.data.category ? ` | Kategória: ${parsed.data.category}` : ''}`
      ),
    ],
  });

  await logToChannel(
    interaction.client,
    auditEmbed({ action: 'Tárgy hozzáadva', user: interaction.user.id, item: item.name, qty: parsed.data.qty }),
    interaction.guildId
  );
}
