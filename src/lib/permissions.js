import db from './db.js';
import { errorEmbed } from './embeds.js';

export async function requireArmorer(interaction) {
  const config = await db.config.findUnique({ where: { guildId: interaction.guildId } });

  if (!config?.armorRoleId) {
    await interaction.reply({
      embeds: [
        errorEmbed(
          'Nincs konfigurálva',
          'A bot még nincs beállítva ezen a szerveren. Egy adminisztrátor fusson le: `/admin setup role`'
        ),
      ],
      ephemeral: true,
    });
    return false;
  }

  const member = interaction.member;
  if (!member.roles.cache.has(config.armorRoleId) && !member.permissions.has('Administrator')) {
    await interaction.reply({
      embeds: [errorEmbed('Nincs jogosultságod', 'Csak fegyverkezelők használhatják ezt a parancsot.')],
      ephemeral: true,
    });
    return false;
  }

  return true;
}
