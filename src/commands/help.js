import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const builder = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Az összes elérhető parancs listája');

export function buildHelpEmbed() {
  return new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle('ℹ️ Raktárkezelő bot – parancsok')
    .addFields(
      {
        name: '📦 Tárgykatalógus (`/targy`)',
        value: [
          '`/targy add` – Új tárgy felvétele',
          '`/targy edit` – Tárgy adatainak szerkesztése',
          '`/targy remove` – Tárgy archiválása',
          '`/targy info` – Tárgy részletei és mozgásnapló',
          '`/targy list` – Teljes raktárlista',
          '`/targy search` – Tárgy keresése név alapján',
        ].join('\n'),
      },
      {
        name: '📊 Készletmozgás (`/keszlet`)',
        value: [
          '`/keszlet in` – Beérkezés rögzítése',
          '`/keszlet out` – Kivétel rögzítése',
          '`/keszlet adjust` – Készlet manuális korrekciója',
        ].join('\n'),
      },
      {
        name: '🎒 Kiadások (`/kiadas`)',
        value: [
          '`/kiadas new` – Tárgy kiadása tagnak',
          '`/kiadas return` – Kiadott tárgy visszavétele',
          '`/kiadas list` – Összes aktív kiadás',
          '`/kiadas my` – Saját aktív kiadásaim',
        ].join('\n'),
      },
      {
        name: '⚙️ Adminisztráció (`/admin`)',
        value: [
          '`/admin log` – Mozgásnapló megtekintése',
          '`/admin lowstock` – Alacsony készletű tárgyak',
          '`/admin setup role` – Fegyvertáros szerepkör beállítása',
          '`/admin setup logchannel` – Napló csatorna beállítása',
        ].join('\n'),
      }
    )
    .setFooter({ text: '⚠️ jelzi az alacsony készletet (elérhető ≤ minimum)' })
    .setTimestamp();
}

export async function execute(interaction) {
  return interaction.reply({ embeds: [buildHelpEmbed()], ephemeral: true });
}
