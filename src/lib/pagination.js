import { ActionRowBuilder, ButtonBuilder } from 'discord.js';
import { ButtonStyle } from 'discord-api-types/v10';

export const PAGE_SIZE = 10;

// B-08 fix: customId encodes listType so the button handler knows what to re-query
export function buildPaginationRow(page, totalPages, listType) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`page_prev_${page}_${listType}`)
      .setEmoji('⬅️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 0),
    new ButtonBuilder()
      .setCustomId(`page_info_${page}_${listType}`)
      .setLabel(`${page + 1} / ${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`page_next_${page}_${listType}`)
      .setEmoji('➡️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1)
  );
}
