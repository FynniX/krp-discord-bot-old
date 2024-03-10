import { dirname } from "@discordx/importer";
import { GeneratorMessage } from "./interfaces/GeneratorMessage";
import { exec } from 'child_process';
import prisma from "./lib/prisma.js";
import admzip from "adm-zip";
import path from "path";
import fs from "fs";

async function lockAsync(path: string, guid: string) {
    return new Promise((resolve, reject) => {
        exec(`${process.platform !== "win32" ? "wine " : ""}lock.exe "${path}" /${guid}`, (error, stdout) => {
            if (error !== null) {
                reject(stdout.trim());
                return;
            }

            resolve(stdout.trim());
        });
    });
}

async function createZip(tmpDir: string, filepath: string) {
    const zip = new admzip();
    zip.addLocalFolder(tmpDir);
    return zip.writeZipPromise(filepath);
}

async function start(memberId: number, modId: number) {
    if (!process.send)
        process.exit();

    // Check weather args are correct
    if (memberId === -1 || modId === -1) {
        process.send({ type: "result", success: false, message: "Internal error" })
        return
    }

    const modFolder = path.join(dirname(import.meta.url), "../mods");
    const tmpFolder = path.join(dirname(import.meta.url), "../tmp");
    const publicFolder = path.join(dirname(import.meta.url), "../public");

    // Create folder when don't exist
    if (!fs.existsSync(modFolder))
        fs.mkdirSync(modFolder, { recursive: true });

    if (!fs.existsSync(tmpFolder))
        fs.mkdirSync(tmpFolder, { recursive: true });

    if (!fs.existsSync(publicFolder))
        fs.mkdirSync(publicFolder, { recursive: true });

    // Set progress to start
    process.send({ type: "progress", progress: 0 })

    // Find member and mod
    const member = await prisma.member.findUnique({ where: { id: memberId, guid: { not: null } } });
    const mod = await prisma.mods.findUnique({ where: { id: modId } });

    if (!member || !mod) {
        process.send({ type: "result", success: false, message: "Internal error" })
        return
    }

    process.send({ type: "progress", progress: 10 })

    // Limit to 2 requests per day per track if not a admin
    if(!member.isAdmin) {
        const files = await prisma.files.findMany({
            where: {
                memberId: member.id,
                modId: mod.id,
                createdAt: {
                    lte: new Date(Date.now()).toISOString(),
                    gte: new Date(Date.now() - (1000 * 60 * 60)).toISOString(),
                }
            }
        })

        if(files.length > 2) {
            process.send({ type: "result", success: false, message: "You can only request 2 files of the same mod per hour" })
            return
        }
    }

    let file = await prisma.files.create({
        data: {
            member: { connect: { id: member.id } },
            mod: { connect: { id: mod.id } },
        }
    })

    process.send({ type: "progress", progress: 20 })

    const modFile = path.join(modFolder, mod.filename);
    const tmpDir = path.join(tmpFolder, file.id.toFixed(0));
    const filepath = path.join(publicFolder, `${file.id.toFixed(0)}.zip`);
    const filename = `${file.id.toFixed(0)}.zip`;

    process.send({ type: "progress", progress: 30 })

    // Create tmp folder
    if (!fs.existsSync(tmpDir))
        fs.mkdirSync(tmpDir, { recursive: true });
    fs.copyFileSync(modFile, path.join(tmpDir, mod.filename));

    process.send({ type: "progress", progress: 40 })

    try {
        const stdout = await lockAsync(process.platform !== "win32" ? path.join('tmp', file.id.toFixed(0), mod.filename) : path.join(tmpDir, mod.filename), member.guid as string)
        process.send({ type: "progress", progress: 60 })
        await createZip(tmpDir, filepath);
        process.send({ type: "progress", progress: 80 })
        fs.rmSync(tmpDir, { recursive: true });

        file = await prisma.files.update({
            where: { id: file.id },
            data: {
                hasFailed: false,
                isFinished: true
             }
        })
        
        process.send({ type: "progress", progress: 100 })
        process.send({ type: "result", success: true, filename })
    } catch (err) {
        console.log(err);
        fs.rmSync(tmpDir, { recursive: true });

        file = await prisma.files.update({
            where: { id: file.id },
            data: {
                hasFailed: true,
                isFinished: true
             }
        })

        process.send({ type: "result", success: false, message: "Internal error" })
    }
}

process.on('message', (message: GeneratorMessage) => {
    switch (message.type) {
        case "start":
            start(message.memberId || -1, message.modId || -1);
            break;
        case "end":
            process.exit();
            break;
    }
})