import { SlashCommandSubcommandBuilder, EmbedBuilder } from 'discord.js';
import db from '../../lib/db.js';
import { requireArmorer } from '../../lib/permissions.js';

export const builder = new SlashCommandSubcommandBuilder()
  .setName('raktar')
  .setDescription('Teljes raktárkészlet áttekintése');

export async function execute(interaction) {
  if (!(await requireArmorer(interaction))) return;

  const items = await db.item.findMany({
    where: { guildId: interaction.guildId, archived: false },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });

  if (items.length === 0) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x3498db).setTitle('📦 Teljes raktár').setDescription('Nincs rögzített tárgy.')],
      ephemeral: true,
    });
  }

  // Alacsony készletűek előre, azon belül kategória/név szerint
  const sorted = [
    ...items.filter((i) => i.minStock > 0 && i.availableQty <= i.minStock),
    ...items.filter((i) => !(i.minStock > 0 && i.availableQty <= i.minStock)),
  ];

  const lines = sorted.map((i) => {
    const low = i.minStock > 0 && i.availableQty <= i.minStock;
    const cat = i.category ? ` *(${i.category})*` : '';
    const min = i.minStock > 0 ? ` | min: ${i.minStock}` : '';
    return `${low ? '⚠️' : '✅'} **${i.name}** — ${i.availableQty}/${i.totalQty} db${min}${cat}`;
  });

  // Discord embed leírás max 4096 karakter — nagy raktárnál több embedbe törik
  const chunks = [];
  let current = '';
  for (const line of lines) {
    if ((current + '\n' + line).length > 4000) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? current + '\n' + line : line;
    }
  }
  if (current) chunks.push(current);

  const embeds = chunks.map((desc, i) =>
    new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle(i === 0 ? `📦 Teljes raktár (${items.length} tárgy)` : '​')
      .setDescription(desc)
      .setTimestamp(i === chunks.length - 1 ? new Date() : null)
  );

  await interaction.reply({ embeds, ephemeral: true });
}
