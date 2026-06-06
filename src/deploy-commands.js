import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

import { builder as targyAddBuilder } from './commands/targy/add.js';
import { builder as targyEditBuilder } from './commands/targy/edit.js';
import { builder as targyRemoveBuilder } from './commands/targy/remove.js';
import { builder as targyInfoBuilder } from './commands/targy/info.js';
import { builder as targyListBuilder } from './commands/targy/list.js';
import { builder as targySearchBuilder } from './commands/targy/search.js';

import { builder as keszletInBuilder } from './commands/keszlet/in.js';
import { builder as keszletOutBuilder } from './commands/keszlet/out.js';
import { builder as keszletAdjustBuilder } from './commands/keszlet/adjust.js';

import { builder as kiadasNewBuilder } from './commands/kiadas/new.js';
import { builder as kiadasReturnBuilder } from './commands/kiadas/return.js';
import { builder as kiadasListBuilder } from './commands/kiadas/list.js';
import { builder as kiadasMyBuilder } from './commands/kiadas/my.js';

import { builder as adminLogBuilder } from './commands/admin/log.js';
import { builder as adminLowstockBuilder } from './commands/admin/lowstock.js';
import { builder as adminRaktarBuilder } from './commands/admin/raktar.js';
import { roleBuilder, logchannelBuilder } from './commands/admin/setup.js';

import { builder as helpBuilder } from './commands/help.js';

const commands = [
  helpBuilder,

  new SlashCommandBuilder()
    .setName('targy')
    .setDescription('Tárgykatalógus kezelése')
    .addSubcommand(targyAddBuilder)
    .addSubcommand(targyEditBuilder)
    .addSubcommand(targyRemoveBuilder)
    .addSubcommand(targyInfoBuilder)
    .addSubcommand(targyListBuilder)
    .addSubcommand(targySearchBuilder),

  new SlashCommandBuilder()
    .setName('keszlet')
    .setDescription('Készletmozgás rögzítése')
    .addSubcommand(keszletInBuilder)
    .addSubcommand(keszletOutBuilder)
    .addSubcommand(keszletAdjustBuilder),

  new SlashCommandBuilder()
    .setName('kiadas')
    .setDescription('Egyéni kiadás kezelése')
    .addSubcommand(kiadasNewBuilder)
    .addSubcommand(kiadasReturnBuilder)
    .addSubcommand(kiadasListBuilder)
    .addSubcommand(kiadasMyBuilder),

  new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Adminisztrációs parancsok')
    .addSubcommand(adminLogBuilder)
    .addSubcommand(adminLowstockBuilder)
    .addSubcommand(adminRaktarBuilder)
    .addSubcommandGroup((group) =>
      group
        .setName('setup')
        .setDescription('Bot konfiguráció')
        .addSubcommand(roleBuilder)
        .addSubcommand(logchannelBuilder)
    ),
].map((cmd) => cmd.toJSON());

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

const guildId = process.env.GUILD_ID;

(async () => {
  try {
    console.log(`Parancsok regisztrálása... (${commands.length} parancs)`);

    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId), { body: commands });
      console.log(`Guild parancsok regisztrálva: ${guildId}`);
    } else {
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
      console.log('Globális parancsok regisztrálva (akár 1 óra propagáció).');
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
