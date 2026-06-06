import djs, { SlashCommandSubcommandBuilder } from 'discord.js';
const { PermissionFlagsBits } = djs;
import db from '../../lib/db.js';
import { successEmbed, errorEmbed } from '../../lib/embeds.js';

export const roleBuilder = new SlashCommandSubcommandBuilder()
  .setName('role')
  .setDescription('Fegyverkezelő (Armorer) role beállítása')
  .addRoleOption((o) => o.setName('role').setDescription('A role').setRequired(true));

export const logchannelBuilder = new SlashCommandSubcommandBuilder()
  .setName('logchannel')
  .setDescription('Log csatorna beállítása')
  .addChannelOption((o) => o.setName('channel').setDescription('A csatorna').setRequired(true));

async function requireAdmin(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      embeds: [errorEmbed('Nincs jogosultságod', 'Csak szerveradminisztrátorok konfigurálhatják a botot.')],
      ephemeral: true,
    });
    return false;
  }
  return true;
}

export async function executeRole(interaction) {
  if (!(await requireAdmin(interaction))) return;

  const role = interaction.options.getRole('role');

  await db.config.upsert({
    where: { guildId: interaction.guildId },
    create: { guildId: interaction.guildId, armorRoleId: role.id },
    update: { armorRoleId: role.id },
  });

  await interaction.reply({
    embeds: [successEmbed('Role beállítva', `A fegyverkezelő role: ${role}`)],
    ephemeral: true,
  });
}

export async function executeLogchannel(interaction) {
  if (!(await requireAdmin(interaction))) return;

  const channel = interaction.options.getChannel('channel');

  if (!channel.isTextBased()) {
    return interaction.reply({
      embeds: [errorEmbed('Érvénytelen csatorna', 'Csak szöveges csatornát lehet megadni.')],
      ephemeral: true,
    });
  }

  await db.config.upsert({
    where: { guildId: interaction.guildId },
    create: { guildId: interaction.guildId, logChannelId: channel.id },
    update: { logChannelId: channel.id },
  });

  await interaction.reply({
    embeds: [successEmbed('Log csatorna beállítva', `Audit logok ide kerülnek: ${channel}`)],
    ephemeral: true,
  });
}
