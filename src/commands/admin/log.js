import { SlashCommandSubcommandBuilder, EmbedBuilder } from 'discord.js';
import db from '../../lib/db.js';
import { requireArmorer } from '../../lib/permissions.js';

const TYPE_LABEL = {
  IN: '📥 Beérkezés',
  OUT: '📤 Kimenet',
  ADJUST: '🔧 Kiigazítás',
  ASSIGN: '👤 Kiadás',
  RETURN: '↩️ Visszavétel',
};

export const builder = new SlashCommandSubcommandBuilder()
  .setName('log')
  .setDescription('Legutóbbi műveletek listája')
  .addIntegerOption((o) =>
    o.setName('limit').setDescription('Hány bejegyzés (max 25)').setMinValue(1).setMaxValue(25).setRequired(false)
  );

export async function execute(interaction) {
  if (!(await requireArmorer(interaction))) return;

  const limit = interaction.options.getInteger('limit') ?? 10;

  const movements = await db.movement.findMany({
    where: { item: { guildId: interaction.guildId } },
    include: { item: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const embed = new EmbedBuilder()
    .setColor(0x2c3e50)
    .setTitle(`📋 Audit log (utolsó ${limit})`)
    .setTimestamp();

  if (movements.length === 0) {
    embed.setDescription('Nincs rögzített művelet.');
  } else {
    const lines = movements.map(
      (m) =>
        `${TYPE_LABEL[m.type] ?? m.type} **${m.item.name.slice(0, 50)}** × ${m.qty} — <@${m.userId}> (${new Date(m.createdAt).toLocaleString('hu-HU')})${m.reason ? ` — *${m.reason.slice(0, 80)}*` : ''}`
    );
    // Discord embed description max 4096 chars
    let desc = lines.join('\n');
    if (desc.length > 4000) desc = desc.slice(0, 3997) + '…';
    embed.setDescription(desc);
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
