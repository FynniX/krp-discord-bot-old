import { Discord, SelectMenuComponent, Slash, SlashGroup, SlashOption } from "discordx";
import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, CommandInteraction, GuildMemberRoleManager, MessageActionRowComponentBuilder, StringSelectMenuBuilder, StringSelectMenuInteraction } from "discord.js";
import { GeneratorMessage } from "../interfaces/GeneratorMessage.js";
import { ModSelection } from "../interfaces/ModSelection.js";
import { dirname } from '@discordx/importer';
import prisma from "../lib/prisma.js";
import { fork } from "child_process";
import path from "path";

@Discord()
@SlashGroup({ name: "generate", description: "Generate your mods" })
@SlashGroup({ name: "profile", description: "Setup your profile", root: "generate" })
export class GenerateCommands {
    private static activeThreads = 0

    private async waitForThreadFree(): Promise<void> {
        return new Promise((resolve) => {
            const id = setInterval(() => {
                if (GenerateCommands.activeThreads >= parseInt(process.env.MAX_THREADS || "0"))
                    return
                clearInterval(id)
                resolve()
            }, 2000)
        })
    }

    private async getMods(): Promise<ModSelection[]> {
        // Generate select menu for mod
        const mods = await prisma.mods.findMany()

        if (!mods || mods.length === 0)
            return []

        return mods.map(mod => ({ label: `${mod.name} - ${mod.version}`, value: mod.id.toFixed(0) }))
    }

    @SelectMenuComponent({ id: "mod-selection" })
    async modSelection(interaction: StringSelectMenuInteraction): Promise<void> {

        await interaction.deferReply({ ephemeral: true });

        const modId = interaction.values?.[0];

        if (!modId) {
            // Generate select menu for mod
            const mods = await this.getMods();

            if (mods.length === 0) {
                interaction.followUp({ content: ":x: - There is currently no mod available", ephemeral: true });
                return
            }

            // Creating menu for selecting mod and version
            const menu = new StringSelectMenuBuilder()
                .addOptions(mods)
                .setCustomId("mod-selection");

            const buttonRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
                .addComponents(menu)

            interaction.editReply({
                components: [buttonRow],
                content: ":x: - Mod not found, select again"
            });

            return
        }

        const member = await prisma.member.findUnique({
            where: { discord: interaction.member?.user.id }
        })

        if (!member) {
            interaction.editReply({ content: ":x: - Member wasn't found in the database" });
            return
        }

        if (member.name === null) {
            interaction.editReply({ content: ":x: - You need to set your name first" });
            return
        }

        if (member.guid === null) {
            interaction.editReply({ content: ":x: - You need to set your guid first" });
            return
        }

        const mods = await prisma.mods.findUnique({
            where: { id: parseInt(modId) }
        })

        if (!mods) {
            interaction.editReply({ content: ":x: - Mod not found" });
            return
        }

        // Has access to mod
        // Weather user has patreon
        const isPatreon = (interaction.member?.roles as GuildMemberRoleManager).cache.some(r => r.id === process.env.PATREON_ROLE)
        const hasAccess = !mods.role ? false : (interaction.member?.roles as GuildMemberRoleManager).cache.some(r => r.id === mods.role)
        if (!hasAccess && !isPatreon && !member.isAdmin && interaction.guild?.ownerId !== interaction.user.id) {
            interaction.editReply({ content: ":x: - You don't have access to this mod" });
            return
        }

        interaction.editReply({ content: "Waiting for free thread..." });
        await this.waitForThreadFree()

        const child = fork(path.join(dirname(import.meta.url), '../generator.js'));
        GenerateCommands.activeThreads++

        child.on('message', (message: GeneratorMessage) => {
            switch (message.type) {
                case "progress":
                    interaction.editReply(`Generating ${message.progress}%`)
                    break;
                case "result":
                    if (message.success) {
                        const button = new ButtonBuilder()
                            .setLabel("Download")
                            .setStyle(ButtonStyle.Link)
                            .setURL(`${process.env.WEBSERVER_URL}/${message.filename}`)

                        const buttonRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
                            .addComponents(button)

                        interaction.editReply({
                            content: "Mod was generated successfully.\nYou can now download it via the button bellow.\n",
                            components: [buttonRow]
                        })
                    } else {
                        interaction.editReply({ content: `:x: - ${message.message}` });
                    }
                default:
                    child.send({ type: "end" })
                    GenerateCommands.activeThreads--
            }
        })

        child.send({ type: "start", memberId: member.id, modId: parseInt(modId) })
    }

    @SlashGroup("generate")
    @Slash({ description: "Request a mod", name: "request" })
    async request(interaction: CommandInteraction) {
        await interaction.deferReply({ ephemeral: true });
        
        const member = await prisma.member.findUnique({
            where: { discord: interaction.member?.user.id }
        })

        if (!member) {
            interaction.editReply({ content: ":x: - Member wasn't found in the database" });
            return
        }

        if (member.name === null) {
            interaction.editReply({ content: ":x: - You need to set your name first" });
            return
        }

        if (member.guid === null) {
            interaction.editReply({ content: ":x: - You need to set your guid first" });
            return
        }

        // Generate select menu for mod
        const mods = await this.getMods();

        if (mods.length === 0) {
            interaction.editReply({ content: ":x: - There is currently no mod available" });
            return
        }

        // Creating menu for selecting mod and version
        const menu = new StringSelectMenuBuilder()
            .addOptions(mods)
            .setCustomId("mod-selection");

        const buttonRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
            .addComponents(menu)

        interaction.editReply({
            components: [buttonRow],
            content: "Select the requested mod"
        });
    }

    @SlashGroup("profile", "generate")
    @Slash({ description: "Set a name for your profile", name: "name" })
    async setName(
        @SlashOption({
            description: "Full name for your profile",
            name: "name",
            required: true,
            type: ApplicationCommandOptionType.String,
        }) name: string,
        interaction: CommandInteraction
    ) {
        const member = await prisma.member.findUnique({
            where: { discord: interaction.member?.user.id }
        })

        if (!member) {
            interaction.reply({ content: ":x: - Member wasn't found in the database", ephemeral: true });
            return
        }

        try {
            await prisma.member.update({
                where: { id: member.id },
                data: { name }
            })
        } catch (err) {
            interaction.reply({ content: ":x: - Internal issue with the database", ephemeral: true });
            return
        }

        interaction.reply({ content: ":white_check_mark: - Successfully set the name", ephemeral: true });
    }

    @SlashGroup("profile", "generate")
    @Slash({ description: "Set a guid for your profile", name: "guid" })
    async setGuid(
        @SlashOption({
            description: "Guid for your profile",
            name: "guid",
            required: true,
            type: ApplicationCommandOptionType.String,
        }) guid: string,
        interaction: CommandInteraction
    ) {
        const member = await prisma.member.findUnique({
            where: { discord: interaction.member?.user.id }
        })

        if (!member) {
            interaction.reply({ content: ":x: - Member wasn't found in the database", ephemeral: true });
            return
        }

        // Check weather guid is already set
        if (member.guid) {
            interaction.reply({ content: ":x: - You can only set the guid once, contact a admin if you want to change it again.", ephemeral: true });
            return
        }

        try {
            await prisma.member.update({
                where: { id: member.id },
                data: { guid }
            })
        } catch (err) {
            interaction.reply({ content: ":x: - Internal issue with the database", ephemeral: true });
            return
        }

        interaction.reply({ content: ":white_check_mark: - Successfully set the guid", ephemeral: true });
    }
}