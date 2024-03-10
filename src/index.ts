import 'dotenv/config'
import { dirname, importx } from '@discordx/importer';
import client from './lib/discord.js';
import prisma from './lib/prisma.js';
import express from 'express'
import path from 'path';
import fs from 'fs'

let app = express()
app.use(express.static(path.join(dirname(import.meta.url), '../public')))

client.on("ready", async () => {
  console.log(">> Bot started");

  // to create/update/delete discord application commands
  await client.initApplicationCommands();

  app.listen(process.env.WEBSERVER_PORT)
  console.log(`>> Webserver started on http://localhost:${process.env.WEBSERVER_PORT}/`)

  // Check weather a file expired each hour
  setInterval(async () => {
    const lte = new Date(Date.now() - 1000 * 60 * 60).toISOString()

    const files = await prisma.files.findMany({
      where: {
        createdAt: { lte }
      }
    })

    await prisma.files.updateMany({
      where: {
        createdAt: { lte }
      }, data: {
        isExpired: true
      }
    })

    for (const file of files) {
      const filepath = path.join(dirname(import.meta.url), "../public", `${file.id.toFixed(0)}.zip`);
      if (fs.existsSync(filepath))
        fs.rmSync(filepath)
    }
  }, 1000 * 60 * 60)
});

client.on("interactionCreate", (interaction) => {
  client.executeInteraction(interaction);
});

// import events
await importx(`${dirname(import.meta.url)}/events/**/*.{js,ts}`);

// import commands
await importx(`${dirname(import.meta.url)}/commands/**/*.{js,ts}`);

client.login(process.env.BOT_TOKEN || '');