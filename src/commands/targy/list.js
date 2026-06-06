import { SlashCommandSubcommandBuilder, EmbedBuilder } from 'discord.js';
import db from '../../lib/db.js';
import { buildPaginationRow, PAGE_SIZE } from '../../lib/pagination.js';

export const builder = new SlashCommandSubcommandBuilder()
  .setName('list')
  .setDescription('Raktár teljes tartalma')
  .addStringOption((o) => o.setName('category').setDescription('Szűrés kategóriára').setRequired(false))
  .addIntegerOption((o) =>
    o.setName('page').setDescription('Oldal száma').setMinValue(1).setRequired(false)
  );

export async function execute(interaction, pageOverride) {
  const category = interaction.options?.getString('category');
  const page = pageOverride ?? (interaction.options?.getInteger('page') ?? 1) - 1;

  const where = {
    guildId: interaction.guildId,
    archived: false,
    ...(category ? { category: { equals: category } } : {}),
  };

  const [total, items] = await Promise.all([
    db.item.count({ where }),
    db.item.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle(`📋 Raktár lista${category ? ` — ${category}` : ''} (${total} tárgy)`)
    .setTimestamp();

  if (items.length === 0) {
    embed.setDescription('Nincs tárgy ebben a kategóriában.');
  } else {
    const lines = items.map(
      (i) =>
        `**${i.name}** — ${i.availableQty}/${i.totalQty} db${i.category ? ` *(${i.category})*` : ''}${
          i.availableQty <= i.minStock && i.minStock > 0 ? ' ⚠️' : ''
        }`
    );
    embed.setDescription(lines.join('\n'));
  }

  const components = totalPages > 1 ? [buildPaginationRow(page, totalPages, 'targy')] : [];
  return { embeds: [embed], components };
}
