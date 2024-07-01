import axios from "axios";
import { fetchWithTimeout, parseError, ppplbot, sleep } from "./utils";
console.log("IN Checker Class")
interface IClient {
    "channelLink": string;
    "dbcoll": string,
    "link": string,
    "name": string,
    "number": string,
    "password": string,
    "repl": string,
    "userName": string,
    "clientId": string,
    "deployKey": string,
    "mainAccount": string,
    "product": string,
    "mobile": string,
    "username": string,
    downTime: number,
    lastPingTime: number
}

export class Checker {
    static instance = undefined;
    clientsMap: Map<string, IClient> = new Map();
    pings = {};
    connetionQueue = [];
    count = 0;

    startedConnecting = false;
    timeOptions: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Kolkata', timeZoneName: 'short' };

    constructor() {
        this.main();
    };

    static getinstance(): Checker {
        if (!Checker.instance) {
            console.log('creating instance-------')
            Checker.instance = new Checker();
        }
        return Checker.instance;
    }

    static async setClients(clients: any[]) {
        Checker.getinstance();
        for (const client of clients) {
            this.instance.clientsMap.set(client.clientId, client)
        }
        await fetchWithTimeout(`${ppplbot()}&text=Refreshed Map :: PingerService`);
    }

    async getClientOff(clientId: string, processId: string): Promise<boolean> {
        const client = this.clientsMap.get(clientId);
        if (client) {
            try {
                const connectResp = await fetchWithTimeout(`${client.repl}/getprocessid`, { timeout: 10000 });
                if (connectResp.data.ProcessId === processId) {
                    this.clientsMap.set(clientId, { ...client, downTime: 0, lastPingTime: Date.now() });
                    this.pushToconnectionQueue(clientId, processId);
                    return true;
                } else {
                    console.log(`Actual Process Id from ${client.repl}/getprocessid :: `, connectResp.data.ProcessId);
                    console.log("Request received from Unknown process");
                    return false;
                }
            } catch (error) {
                parseError(error, "Some Error here:")
            }
        } else {
            console.log(new Date(Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), `Client ${clientId} Not exist`);
        }
    }

    async receivePing(clientId: string): Promise<void> {
        const client = this.clientsMap.get(clientId);
        if (client) {
            this.clientsMap.set(clientId, { ...client, downTime: 0, lastPingTime: Date.now() });
            this.pings[clientId] = Date.now();
            // console.log(new Date(Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), clientId, 'Ping!! Received!!');
        } else {
            console.log(new Date(Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), `Client ${clientId} Not exist`);
        }
    }

    async requestCall(clientId: string, chatId: string, type: string): Promise<void> {
        const client = this.clientsMap.get(clientId);
        // console.log(`Call Request Received: ${clientId} | ${chatId}`);
        if (client) {
            const payload = { chatId, profile: client.clientId, type };
            const options = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(payload),
            };
            const result = await fetchWithTimeout("https://arpithared.onrender.com/events/schedule", options, 3);
            console.log("eventsResponse:", result?.data);
        } else {
            console.log(new Date(Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), `Client ${clientId} Not exist`);
        }
    }

    async pushToconnectionQueue(clientId: string, processId: string) {
        const existingIndex = this.connetionQueue.findIndex(entry => entry.clientId === clientId);
        if (existingIndex !== -1) {
            this.connetionQueue[existingIndex].processId = processId;
        } else {
            this.connetionQueue.push({ clientId, processId });
        }
    }


    main() {
        setInterval(async () => {
            this.count = this.count + 1
            this.connectToNewClients();
            if (this.count % 4 == 1) {
                console.log(`-------------------------------------------------------------`)
                await this.checkPings()
            }
        }, 30000)
    }


    async connectToNewClients() {
        if (this.connetionQueue.length > 0 && !this.startedConnecting) {
            console.log("Connecting new clients")
            while (this.connetionQueue.length > 0) {
                this.startedConnecting = true;
                if (this.connetionQueue.length == 1) {
                    this.startedConnecting = false;
                }
                const { clientId, processId } = this.connetionQueue.shift();
                console.log('Starting - ', clientId);
                try {
                    const client = this.clientsMap.get(clientId);
                    await fetchWithTimeout(`${client.repl}/tryToConnect/${processId}`, { timeout: 10000 });
                    setTimeout(async () => {
                        await fetchWithTimeout(`${client.repl}/promote`);
                        setTimeout(async () => {
                            await fetchWithTimeout(`${client.repl}/markasread`);
                        }, 35000);
                    }, 35000);
                } catch (error) {
                    parseError(error, "Error at connect ::")
                }
                await sleep(5000);
            }
        }
    }

    async checkPings() {
        console.log("Checking Pings")
        for (const client of Array.from(this.clientsMap.values())) {
            if ((Date.now() - this.pings[client.clientId]) > (5 * 60 * 1000) && (Date.now() - client.lastPingTime) > (5 * 60 * 1000)) {
                try {
                    if ((Date.now() - this.pings[client.clientId]) > (7 * 60 * 1000) && (Date.now() - client.lastPingTime) > (7 * 60 * 1000)) {
                        const url = client.repl.includes('glitch') ? `${client.repl}/exit` : client.deployKey;
                        console.log("trying url :", url)
                        try {
                            await axios.get(client.repl);
                        } catch (e) {
                            await fetchWithTimeout(url, {}, 3)
                            await fetchWithTimeout(`${ppplbot()}&text=${client.clientId} : Not responding | url = ${url}`);
                        }
                    } else {
                        await fetchWithTimeout(`${ppplbot()}&text=${client.clientId} : not responding - ${(Date.now() - client.lastPingTime) / 60000}`);
                    }
                } catch (error) {
                    await fetchWithTimeout(`${ppplbot()}&text=${client.clientId} : Url not responding`);
                    console.log("Some Error: ", parseError(error), error.code);
                }
            }

            if (client.downTime > 2) {
                console.log(client.clientId, " - ", client.downTime)
            }
            try {
                await axios.get(`${client.repl}`, { timeout: 120000 });
                this.clientsMap.set(client.clientId, { ...client, downTime: 0 });
                // console.log("Pinged :: ", client.repl)
            } catch (e) {
                console.log(new Date(Date.now()).toLocaleString('en-IN', this.timeOptions), client.repl, ` NOT Reachable - ${client.downTime}`);
                this.clientsMap.set(client.clientId, { ...client, downTime: client.downTime + 1 })
                if (client.downTime > 5) {
                    this.clientsMap.set(client.clientId, { ...client, downTime: -5 })
                    try {
                        const resp = await fetchWithTimeout(`${client.deployKey}`, { timeout: 120000 });
                        if (resp?.status == 200 || resp.status == 201) {
                            await fetchWithTimeout(`${ppplbot()}&text=Restarted ${client.clientId}`);
                        } else {
                            console.log(`Failed to Restart ${client.clientId}`);
                            await fetchWithTimeout(`${ppplbot()}&text=Failed to Restart ${client.clientId}`);
                        }
                    } catch (error) {
                        console.log(`Failed to Restart ${client.clientId}`);
                        await fetchWithTimeout(`${ppplbot()}&text=Failed to Restart ${client.clientId}`);
                    }
                }
            }

            // const userPromoteStats = await db.readSinglePromoteStats(val.clientId);
            // if (userPromoteStats?.isActive && (Date.now() - userPromoteStats?.lastUpdatedTimeStamp) / (1000 * 60) > 12) {
            //     try {
            //         const resp = await axios.get(`${val.url}promote`, { timeout: 120000 });
            //     } catch (error) {
            //         console.log("Some Error: ", parseError(error), error.code);
            //     }
            // }
            await sleep(2000)
        }
        await this.checkService(process.env.tgcms);
        await this.checkService(process.env.uptimebot)
        await this.checkService(process.env.uptimeChecker);
        await this.checkService('https://tgsignup.onrender.com');
        await this.checkService('https://mychatgpt-pg6w.onrender.com', `https://api.render.com/deploy/srv-cflkq853t39778sm0clg?key=e4QNTs9kDw4`)
    }


    async checkService(url: string, deployKey?: string) {
        try {
            await axios.get(url, { timeout: 55000 });
            // console.log("Pinged :: ", url)
        } catch (e) {
            console.log(new Date(Date.now()).toLocaleString('en-IN', this.timeOptions), url, ` NOT Reachable`);
            await fetchWithTimeout(`${ppplbot()}&text=${url}  NOT Reachable`);
            try {
                if (deployKey) {
                    const resp = await axios.get(`${deployKey ? deployKey : `${url}/exit`}`, { timeout: 55000 });
                    if (resp?.status == 200 || resp.status == 201) {
                        await fetchWithTimeout(`${ppplbot()}&text=Restarted ${url}`);
                    }
                }
            } catch (error) {
                console.log(`Cannot restart ${url} server`);
                await fetchWithTimeout(`${ppplbot()}&text=Cannot restart ${url} server`);
            }
        }
    }
}