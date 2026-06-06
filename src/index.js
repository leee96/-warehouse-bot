import 'dotenv/config';
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { logger } from './lib/logger.js';

// S-03: fail fast with a clear message instead of a cryptic discord.js error
if (!process.env.DISCORD_TOKEN) {
  logger.fatal('DISCORD_TOKEN hiányzik a .env fájlból. Állítsd be és indítsd újra a botot.');
  process.exit(1);
}
if (!process.env.CLIENT_ID) {
  logger.fatal('CLIENT_ID hiányzik a .env fájlból.');
  process.exit(1);
}

// --- Command loaders ---
import * as targyAdd from './commands/targy/add.js';
import * as targyEdit from './commands/targy/edit.js';
import * as targyRemove from './commands/targy/remove.js';
import * as targyInfo from './commands/targy/info.js';
import * as targyList from './commands/targy/list.js';
import * as targySearch from './commands/targy/search.js';

import * as keszletIn from './commands/keszlet/in.js';
import * as keszletOut from './commands/keszlet/out.js';
import * as keszletAdjust from './commands/keszlet/adjust.js';

import * as kiadasNew from './commands/kiadas/new.js';
import * as kiadasReturn from './commands/kiadas/return.js';
import * as kiadasList from './commands/kiadas/list.js';
import * as kiadasMy from './commands/kiadas/my.js';

import * as adminLog from './commands/admin/log.js';
import * as adminLowstock from './commands/admin/lowstock.js';
import * as adminRaktar from './commands/admin/raktar.js';
import * as adminSetup from './commands/admin/setup.js';

import * as help from './commands/help.js';

import { execute as onInteraction } from './events/interactionCreate.js';
import { execute as onReady, once as readyOnce } from './events/ready.js';
import { execute as onMessage } from './events/messageCreate.js';

// --- Command registry ---
// Map: commandName -> { execute, autocomplete? }
// Top-level slash commands are group names; subcommands are dispatched here.
const commands = new Collection();

commands.set('targy', {
  execute: async (interaction) => {
    const sub = interaction.options.getSubcommand();
    const map = { add: targyAdd, edit: targyEdit, remove: targyRemove, info: targyInfo, list: targyList, search: targySearch };
    return map[sub]?.execute(interaction);
  },
  autocomplete: async (interaction) => {
    const sub = interaction.options.getSubcommand();
    const map = { edit: targyEdit, remove: targyRemove, info: targyInfo };
    return map[sub]?.autocomplete?.(interaction);
  },
});

commands.set('keszlet', {
  execute: async (interaction) => {
    const sub = interaction.options.getSubcommand();
    const map = { in: keszletIn, out: keszletOut, adjust: keszletAdjust };
    return map[sub]?.execute(interaction);
  },
  autocomplete: async (interaction) => {
    const sub = interaction.options.getSubcommand();
    const map = { in: keszletIn, out: keszletOut, adjust: keszletAdjust };
    return map[sub]?.autocomplete?.(interaction);
  },
});

commands.set('kiadas', {
  execute: async (interaction) => {
    const sub = interaction.options.getSubcommand();
    const map = { new: kiadasNew, return: kiadasReturn, list: kiadasList, my: kiadasMy };
    return map[sub]?.execute(interaction);
  },
  autocomplete: async (interaction) => {
    const sub = interaction.options.getSubcommand();
    if (sub === 'new') return kiadasNew.autocomplete?.(interaction);
  },
});

commands.set('help', {
  execute: (interaction) => help.execute(interaction),
});

commands.set('admin', {
  execute: async (interaction) => {
    const sub = interaction.options.getSubcommand();
    const group = interaction.options.getSubcommandGroup(false);

    if (group === 'setup') {
      if (sub === 'role') return adminSetup.executeRole(interaction);
      if (sub === 'logchannel') return adminSetup.executeLogchannel(interaction);
    }
    if (sub === 'log') return adminLog.execute(interaction);
    if (sub === 'lowstock') return adminLowstock.execute(interaction);
    if (sub === 'raktar') return adminRaktar.execute(interaction);
  },
});

// --- Client ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

if (readyOnce) {
  client.once('ready', (c) => onReady(c));
} else {
  client.on('ready', (c) => onReady(c));
}

client.on('interactionCreate', (interaction) => onInteraction(interaction, commands));
client.on('messageCreate', (message) => onMessage(message));

client.on('error', (err) => logger.error({ err }, 'Client error'));
process.on('unhandledRejection', (err) => logger.error({ err }, 'Unhandled rejection'));

client.login(process.env.DISCORD_TOKEN);
