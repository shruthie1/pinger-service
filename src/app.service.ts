import { Injectable, OnModuleInit } from '@nestjs/common';
import axios from 'axios'
import { uptimechecker } from './utils/constants';
import { fetchWithTimeout, parseError, ppplbot, sleep } from './utils';
import { Checker } from './CheckerClass';
import * as schedule from 'node-schedule-tz';
console.log("In App Service")

@Injectable()
export class AppService implements OnModuleInit {
  constructor() {

    try {
      schedule.scheduleJob('test', ' 0 * * * * ', 'Asia/Kolkata', async () => {
        console.log("Promoting.....");
        const hour = this.getCurrentHourIST();
        const clients = Array.from(Checker.getinstance().clientsMap.values());
        for (const client of clients) {
          await fetchWithTimeout(`${client.repl}/assureppl`);
          await sleep(3000);
          await fetchWithTimeout(`${client.repl}/promote`);
          await sleep(2000);
          if (hour && hour % 3 === 0) {
            await fetchWithTimeout(`${client.repl}/calltopaid`);
          }
        }
      })

      // schedule.scheduleJob('test1', ' 2 3,6,10,16,20,22 * * * ', 'Asia/Kolkata', async () => {
      //     const userValues = Array.from(userMap.values());
      // for (let i = 0; i < userValues.length; i++) {
      //   const value = userValues[i];
      //   })
      // })

      schedule.scheduleJob('test2', '*/10 * * * *', 'Asia/Kolkata', async () => {
        const clients = Array.from(Checker.getinstance().clientsMap.values());
        for (const client of clients) {
          await fetchWithTimeout(`${client.repl}/markasread`);
          await sleep(3000);
        }
      })

      schedule.scheduleJob('test3', ' 15 7,13,16,21,23 * * * ', 'Asia/Kolkata', async () => {
        const clients = Array.from(Checker.getinstance().clientsMap.values());
        for (const client of clients) {
          await fetchWithTimeout(`${client.repl}/asktopay`);
          await sleep(3000);
        }

      })

      schedule.scheduleJob('test3', ' 25 0 * * * ', 'Asia/Kolkata', async () => {
        const clients = Array.from(Checker.getinstance().clientsMap.values());
        for (const client of clients) {
          await sleep(1000);
          await fetchWithTimeout(`${client.repl}/resetunpaid`);
          // await fetchWithTimeout(`${value.url}resetunppl`);
          await fetchWithTimeout(`${client.repl}/getuserstats2`);

          setTimeout(async () => {
            await fetchWithTimeout(`${client.repl}/asktopay`);
          }, 300000);
          await sleep(1000)
        }
        // const now = new Date();
        // if (now.getUTCDate() % 5 === 1) {
        //   setTimeout(async () => {
        //     await db.resetAvailableMsgs();
        //     await db.updateBannedChannels();
        //     await db.updateDefaultReactions();
        //   }, 30000);
        // }

        // await fetchWithTimeout(`${ppplbot()}&text=${encodeURIComponent(await getPromotionStatsPlain())}`);
        // await db.resetPaidUsers();
        // await db.updateActiveChannels();
        // await db.clearStats2();
        // await db.clearAllStats();
        // await db.reinitPromoteStats();

        try {
          await fetchWithTimeout(`https://mychatgpt-pg6w.onrender.com/getstats`, { timeout: 55000 });
          await fetchWithTimeout(`https://mychatgpt-pg6w.onrender.com/clearstats`, { timeout: 55000 });
        } catch (error) {
          parseError(error, "Error Clearing ChatGpt Stats")
        }

      })
    } catch (error) {
      parseError(error, "Some Error During Daily cleanup")
    }

  }
  async onModuleInit() {
    await this.refreshClients()
  }

  async refreshClients() {
    console.log("Refreshing clients")
    try {
      const response = await axios.get(`${uptimechecker}/clients/masked`);
      Checker.setClients(response.data)
    } catch (error) {
      parseError(error)
    }
  }

  getClients(): any {
    return Array.from(Checker.getinstance().clientsMap.values());
  }

  async getClientOff(clientId: string, processId: string) {
    return await Checker.getinstance().getClientOff(clientId, processId)
  }


  async receivePing(clientId: string) {
    return await Checker.getinstance().receivePing(clientId)
  }


  async requestCall(clientId: string, chatId: string, type: string) {
    return await Checker.getinstance().requestCall(clientId, chatId, type)
  }

  getCurrentHourIST() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    const istHour = istTime.getUTCHours();
    return istHour;
  }
  getHello(): string {
    return 'Hello World!';
  }
}
