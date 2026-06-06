import djs from 'discord.js';
const { SlashCommandSubcommandBuilder } = djs;
import db from '../../lib/db.js';
import { requireArmorer } from '../../lib/permissions.js';
import { successEmbed, errorEmbed, auditEmbed } from '../../lib/embeds.js';
import { logToChannel } from '../../lib/logger.js';

export const builder = new SlashCommandSubcommandBuilder()
  .setName('edit')
  .setDescription('Tárgy adatainak szerkesztése')
  .addStringOption((o) =>
    o.setName('name').setDescription('Tárgy neve').setRequired(true).setAutocomplete(true)
  )
  .addStringOption((o) => o.setName('newname').setDescription('Új név').setRequired(false))
  .addStringOption((o) => o.setName('category').setDescription('Új kategória').setRequired(false))
  .addIntegerOption((o) =>
    o.setName('minstock').setDescription('Új minimum készlet').setMinValue(0).setRequired(false)
  );

export async function execute(interaction) {
  if (!(await requireArmorer(interaction))) return;

  const name = interaction.options.getString('name');
  const newname = interaction.options.getString('newname');
  const category = interaction.options.getString('category');
  const minstock = interaction.options.getInteger('minstock');

  if (!newname && !category && minstock === null) {
    return interaction.reply({
      embeds: [errorEmbed('Nincs változtatás', 'Adj meg legalább egy módosítandó mezőt.')],
      ephemeral: true,
    });
  }

  const item = await db.item.findUnique({
    where: { guildId_name: { guildId: interaction.guildId, name } },
  });

  if (!item || item.archived) {
    return interaction.reply({
      embeds: [errorEmbed('Nem található', `**${name}** nevű aktív tárgy nem létezik.`)],
      ephemeral: true,
    });
  }

  if (newname && newname !== name) {
    const conflict = await db.item.findUnique({
      where: { guildId_name: { guildId: interaction.guildId, name: newname } },
    });
    if (conflict && !conflict.archived) {
      return interaction.reply({
        embeds: [errorEmbed('Névütközés', `**${newname}** nevű tárgy már létezik.`)],
        ephemeral: true,
      });
    }
  }

  const updated = await db.item.update({
    where: { id: item.id },
    data: {
      ...(newname ? { name: newname } : {}),
      ...(category !== null ? { category } : {}),
      ...(minstock !== null ? { minStock: minstock } : {}),
    },
  });

  await interaction.reply({
    embeds: [successEmbed('Tárgy frissítve', `**${updated.name}** adatai sikeresen módosítva.`)],
  });

  await logToChannel(
    interaction.client,
    auditEmbed({ action: 'Tárgy szerkesztve', user: interaction.user.id, item: updated.name }),
    interaction.guildId
  );
}

export async function autocomplete(interaction) {
  const focused = interaction.options.getFocused();
  const items = await db.item.findMany({
    where: {
      guildId: interaction.guildId,
      archived: false,
      name: { contains: focused },
    },
    take: 25,
  });
  await interaction.respond(items.map((i) => ({ name: i.name, value: i.name })));
}
