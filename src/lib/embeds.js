import { EmbedBuilder } from 'discord.js';

export function successEmbed(title, description) {
  return new EmbedBuilder().setColor(0x2ecc71).setTitle(`✅ ${title}`).setDescription(description);
}

export function errorEmbed(title, description) {
  return new EmbedBuilder().setColor(0xe74c3c).setTitle(`❌ ${title}`).setDescription(description);
}

export function infoEmbed(title, description) {
  return new EmbedBuilder().setColor(0x3498db).setTitle(`ℹ️ ${title}`).setDescription(description);
}

export function auditEmbed({ action, user, item, qty, reason, timestamp }) {
  const embed = new EmbedBuilder()
    .setColor(0xf39c12)
    .setTitle(`📋 ${action}`)
    .addFields(
      { name: 'Operátor', value: `<@${user}>`, inline: true },
      { name: 'Tárgy', value: item, inline: true }
    )
    .setTimestamp(timestamp ?? new Date());

  if (qty !== undefined) embed.addFields({ name: 'Mennyiség', value: String(qty), inline: true });
  if (reason) embed.addFields({ name: 'Indoklás', value: reason });

  return embed;
}
