import { Events, GuildMember } from "discord.js";
import { Discord, On } from "discordx";
import client from "../lib/discord.js";
import prisma from "../lib/prisma.js";

enum PriorityLevel {
    High,
    Moderate,
    Low,
}

@Discord()
export class MemberRegistration {
    @On({ event: Events.ClientReady, priority: PriorityLevel.Moderate })
    async onReady(): Promise<void> {
        const guild = await client.guilds.fetch(process.env.GUILD_ID || "")
        const guildMembers = await guild.members.fetch()

        // Delete old members that are not in the guild
        let members = await prisma.member.findMany()

        // Check weather a member is not in the guild
        for (const member of members)
            if (!guildMembers.get(member.discord))
                // Delete member
                await prisma.member.delete({ where: { id: member.id } })

        members = await prisma.member.findMany();

        // Add new members
        for (const member of guildMembers.values())
            if (!members.find(m => m.discord === member.id))
                await prisma.member.create({ data: { discord: member.id } })
    }

    @On({ event: Events.GuildMemberAdd, priority: PriorityLevel.Moderate })
    async onMemberAdd(member: GuildMember): Promise<void> {
        if(!member) return
        await prisma.member.create({ data: { discord: member.id } })
    }

    @On({ event: Events.GuildMemberRemove, priority: PriorityLevel.Moderate })
    async onMemberRemove(member: GuildMember): Promise<void> {
        if(!member) return
        await prisma.member.delete({ where: { discord: member.id } })
    }
}