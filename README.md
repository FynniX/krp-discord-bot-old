# krp-discord-bot

A discord bot that does encrypt the mods for you.

## Requirements

### Windows

- git
- lock.exe (Piboso has the file)
- Node.js (Tested with 18.17.0)

### Linux

- git
- lock.exe (Piboso has the file)
- Node.js (Tested with 18.17.0)
- Wine (32 bit + 64 bit)

### Ports

- Make sure WEBSERVER_PORT is open

## Role structure

1. Patreon role

    _Has access to all mods_

2. Mods specific role

    _Only access to one mod_

## Folder structure

- Mods Folder

    Put all unencrypted mods into that folder and name the file while creating the mod per command

## Installing

### General

1. _Open console_

2. _Clone Repository:_

   ```sh
   git clone https://github.com/FynniX/krp-discord-bot.git
   ```

3. _Open Bot Directory_

   ```sh
   cd krp-discord-bot
   ```

4. _Install Packages_

   ```sh
   npm install
   ```

5. _Setup Environment File_

   Copy `.env.example` and rename it to `.env`

   - DATABASE_URL = "file://PATHTOFILE.db"
   - WEBSERVER_URL = http://YOURPUBLICIP:WEBSERVER_PORT
   - WEBSERVER_PORT (Define a free port for it)
   - MAX_THREADS (How many requests can be done simultaneously, be careful)
   - BOT_TOKEN (Discord bot token)
   - GUILD_ID (Discord server id)
   - PATREON_ROLE (Discord role for access to generating)

6. _Setup Prisma_

    ```sh
    npm run generate
    ```

7. _Mods Folder_

    Create a folder called **mods** [Why?](https://github.com/FynniX/krp-discord-bot?tab=readme-ov-file#folder-structure)

8. _Install lock.exe_

   Place **lock.exe** inside bot directory
   
8. _Build Source_

    ```sh
    npm run build
    ```

9. _Start Bot_

    ```sh
    npm start
    ```

### Linux Extras

1.  **Node.js**

    ```sh
    wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    ```

    ```sh
    export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")" [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
    ```

    ```sh
    nvm install 18.17.0
    ```

    ```sh
    nvm use 18.17.0
    ```

2.  **Wine**

    ```sh
    apt update
    ```

    ```sh
    apt install wine
    ```

    ```sh
    dpkg --add-architecture i386 && apt-get update && apt-get install wine32
    ```

3. **pm2**

    Can be used to start the bot on startup and run in background.

    ```sh
    npm i -g pm2
    ```

    ```sh
    pm2 startup
    ```
    
    Skip step 9 in [General Instructions](https://github.com/FynniX/krp-discord-bot/edit/main/README.md#general) and use this command

    ```sh
    pm2 start npm --name KRP-Discord-Bot -- run start
    ```

    ```sh
    pm2 save
    ```

### License

Released under the [MIT License](https://github.com/FynniX/krp-discord-bot/blob/main/LICENSE).
