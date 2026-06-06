import djs from 'discord.js';
const { SlashCommandSubcommandBuilder, EmbedBuilder } = djs;
import db from '../../lib/db.js';
import { requireArmorer } from '../../lib/permissions.js';

export const builder = new SlashCommandSubcommandBuilder()
  .setName('heti')
  .setDescription('Heti raktárösszesítő (elmúlt 7 nap)');

export async function execute(interaction) {
  if (!(await requireArmorer(interaction))) return;

  const since = new Date();
  since.setDate(since.getDate() - 7);

  const movements = await db.movement.findMany({
    where: {
      createdAt: { gte: since },
      item: { guildId: interaction.guildId },
    },
    include: { item: true },
  });

  const totals = { IN: 0, OUT: 0, ADJUST: 0, ASSIGN: 0, RETURN: 0 };
  const itemActivity = {};

  for (const m of movements) {
    totals[m.type] = (totals[m.type] || 0) + m.qty;
    if (!itemActivity[m.item.name]) itemActivity[m.item.name] = 0;
    itemActivity[m.item.name] += m.qty;
  }

  const topItems = Object.entries(itemActivity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const lowStock = await db.item.findMany({
    where: {
      guildId: interaction.guildId,
      archived: false,
      minStock: { gt: 0 },
    },
  }).then((items) => items.filter((i) => i.availableQty <= i.minStock));

  const dateStr = since.toLocaleDateString('hu-HU');

  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle('📊 Heti raktárösszesítő')
    .setDescription(`Időszak: **${dateStr} – ma**`)
    .addFields(
      {
        name: '📦 Mozgások',
        value: [
          `🟢 Beérkezés (IN): **${totals.IN} db**`,
          `🔴 Kivétel (OUT): **${totals.OUT} db**`,
          `📤 Kiadás (ASSIGN): **${totals.ASSIGN} db**`,
          `📥 Visszavétel (RETURN): **${totals.RETURN} db**`,
          `🔧 Korrekció (ADJUST): **${totals.ADJUST} db**`,
        ].join('\n'),
      }
    );

  if (topItems.length > 0) {
    embed.addFields({
      name: '🏆 Legtöbbet mozgott tárgyak',
      value: topItems.map(([ name, qty ], i) => `${i + 1}. **${name}** — ${qty} db`).join('\n'),
    });
  }

  if (lowStock.length > 0) {
    embed.addFields({
      name: '⚠️ Alacsony készlet',
      value: lowStock
        .map((i) => `**${i.name}** — ${i.availableQty}/${i.totalQty} db (min: ${i.minStock})`)
        .join('\n'),
    });
  }

  if (movements.length === 0) {
    embed.setDescription(`Időszak: **${dateStr} – ma**\n\nEbben a héten nem volt raktármozgás.`);
  }

  embed.setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
