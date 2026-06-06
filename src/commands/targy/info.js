import djs from 'discord.js';
const { SlashCommandSubcommandBuilder, EmbedBuilder } = djs;
import db from '../../lib/db.js';
import { errorEmbed } from '../../lib/embeds.js';

const MOVEMENT_LABEL = {
  IN: '📥 Beérkezés',
  OUT: '📤 Kimenet',
  ADJUST: '🔧 Kiigazítás',
  ASSIGN: '👤 Kiadás',
  RETURN: '↩️ Visszavétel',
};

export const builder = new SlashCommandSubcommandBuilder()
  .setName('info')
  .setDescription('Tárgy részletes adatai')
  .addStringOption((o) =>
    o.setName('name').setDescription('Tárgy neve').setRequired(true).setAutocomplete(true)
  );

export async function execute(interaction) {
  const name = interaction.options.getString('name');

  const item = await db.item.findUnique({
    where: { guildId_name: { guildId: interaction.guildId, name } },
    include: {
      assignments: { where: { returnedAt: null }, orderBy: { assignedAt: 'desc' } },
      movements: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  });

  if (!item) {
    return interaction.reply({
      embeds: [errorEmbed('Nem található', `**${name}** nevű tárgy nem létezik.`)],
      ephemeral: true,
    });
  }

  const embed = new EmbedBuilder()
    .setColor(item.archived ? 0x95a5a6 : 0x3498db)
    .setTitle(`📦 ${item.name}${item.archived ? ' (archivált)' : ''}`)
    .addFields(
      { name: 'Összes készlet', value: String(item.totalQty), inline: true },
      { name: 'Elérhető', value: String(item.availableQty), inline: true },
      { name: 'Kiadva', value: String(item.totalQty - item.availableQty), inline: true },
      { name: 'Min. készlet', value: String(item.minStock), inline: true },
      { name: 'Kategória', value: item.category ?? '—', inline: true }
    )
    .setTimestamp(item.updatedAt);

  if (item.assignments.length > 0) {
    const assignList = item.assignments
      .slice(0, 10)
      .map(
        (a) =>
          `<@${a.userId}> — **${a.qty} db** (\`${a.id.slice(-6)}\`) ${new Date(a.assignedAt).toLocaleDateString('hu-HU')}`
      )
      .join('\n');
    embed.addFields({ name: `Aktív kiadások (${item.assignments.length})`, value: assignList });
  }

  // B-06 fix: actually display the fetched movements
  if (item.movements.length > 0) {
    const movLog = item.movements
      .map(
        (m) =>
          `${MOVEMENT_LABEL[m.type] ?? m.type} **${m.qty} db** — <@${m.userId}> ${new Date(m.createdAt).toLocaleDateString('hu-HU')}${m.reason ? ` *(${m.reason})*` : ''}`
      )
      .join('\n');
    embed.addFields({ name: 'Utolsó 5 mozgás', value: movLog });
  }

  if (item.availableQty <= item.minStock && item.minStock > 0) {
    embed.addFields({ name: '⚠️ Figyelmeztetés', value: 'Készlet a minimum határ alatt vagy azon!' });
    embed.setColor(0xe74c3c);
  }

  await interaction.reply({ embeds: [embed] });
}

export async function autocomplete(interaction) {
  const focused = interaction.options.getFocused();
  const items = await db.item.findMany({
    where: { guildId: interaction.guildId, name: { contains: focused } },
    take: 25,
  });
  await interaction.respond(
    items.map((i) => ({ name: `${i.name}${i.archived ? ' [archivált]' : ''}`, value: i.name }))
  );
}
