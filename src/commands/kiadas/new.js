import { SlashCommandSubcommandBuilder } from 'discord.js';
import db from '../../lib/db.js';
import { requireArmorer } from '../../lib/permissions.js';
import { successEmbed, errorEmbed, auditEmbed } from '../../lib/embeds.js';
import { logToChannel } from '../../lib/logger.js';

export const builder = new SlashCommandSubcommandBuilder()
  .setName('new')
  .setDescription('Tárgy kiadása felhasználónak')
  .addStringOption((o) =>
    o.setName('name').setDescription('Tárgy neve').setRequired(true).setAutocomplete(true)
  )
  .addUserOption((o) => o.setName('user').setDescription('Felhasználó').setRequired(true))
  .addIntegerOption((o) =>
    o.setName('qty').setDescription('Mennyiség').setMinValue(1).setRequired(true)
  )
  .addStringOption((o) => o.setName('reason').setDescription('Indoklás').setRequired(false));

export async function execute(interaction) {
  if (!(await requireArmorer(interaction))) return;

  const name = interaction.options.getString('name');
  const targetUser = interaction.options.getUser('user');
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

  if (item.availableQty < qty) {
    return interaction.reply({
      embeds: [
        errorEmbed(
          'Nincs elég készlet',
          `Csak **${item.availableQty} db** áll rendelkezésre, de **${qty} db**-t próbálsz kiadni.`
        ),
      ],
      ephemeral: true,
    });
  }

  const [assignment] = await db.$transaction(async (tx) => {
    const a = await tx.assignment.create({
      data: {
        itemId: item.id,
        guildId: interaction.guildId,
        userId: targetUser.id,
        qty,
      },
    });
    await tx.item.update({
      where: { id: item.id },
      data: { availableQty: { decrement: qty } },
    });
    await tx.movement.create({
      data: { itemId: item.id, type: 'ASSIGN', qty, userId: interaction.user.id, reason },
    });
    return [a];
  });

  await interaction.reply({
    embeds: [
      successEmbed(
        'Kiadás rögzítve',
        `**${item.name}** × **${qty} db** kiadva: <@${targetUser.id}>\nKiadás azonosítója: \`${assignment.id}\``
      ),
    ],
  });

  await logToChannel(
    interaction.client,
    auditEmbed({
      action: 'Kiadás (ASSIGN)',
      user: interaction.user.id,
      item: `${item.name} → <@${targetUser.id}>`,
      qty,
      reason,
    })
  );
}

export async function autocomplete(interaction) {
  const focused = interaction.options.getFocused();
  const items = await db.item.findMany({
    where: {
      guildId: interaction.guildId,
      archived: false,
      availableQty: { gt: 0 },
      name: { contains: focused },
    },
    take: 25,
  });
  await interaction.respond(items.map((i) => ({ name: `${i.name} (${i.availableQty} db)`, value: i.name })));
}
