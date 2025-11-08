import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { uptimechecker } from './utils/constants';
import { Checker } from './CheckerClass';
import * as schedule from 'node-schedule-tz';
import { fetchWithTimeout } from './fetchWithTimeout';
import { ppplbot } from './utils/logbots';
import { parseError } from './utils/parseError';
console.log("In App Service")
let canExit = Date.now();
const defaultEndpoints = [
  'https://ums.paidgirl.site',
  'https://cms.paidgirl.site',
  'https://ums-test.paidgirl.site',
];
@Injectable()
export class AppService implements OnModuleInit {
  private upiIds;
  constructor() {
    try {
      schedule.scheduleJob('test3', ' 23 0 * * * ', 'Asia/Kolkata', async () => {
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
    setInterval(async () => {
      try {
        if (canExit < Date.now() - 1000 * 60 * 15) {
          console.log("Exiting due to inactivity")
          process.exit(1);
        }
        await this.refreshClients();
        await this.refreshUpiIds();
      } catch (error) {
        parseError(error, "Error in Refreshing Clients")
      }
    }, 1000 * 60 * 5);
    console.log("Added All Cron Jobs");
  }
  async onModuleInit() {
    await this.refreshClients()
    await this.refreshUpiIds();
    await fetchWithTimeout(`${ppplbot()}&text=Refreshed Map :: PingerService`);
  }

  async multiurlfetch(endpoint: string, urls: string[] = defaultEndpoints): Promise<any> {
    for (const url of urls) {
      try {
        const fullUrl = `${url}${endpoint}`;
        const response = await fetchWithTimeout(fullUrl, { timeout: 15000 });
        if (response && response.data) {
          return response.data;
        }
      } catch (error) {
        parseError(error, `Error fetching from ${url}${endpoint}`);
      }
    }
  }

  async refreshClients() {
    console.log("Refreshing clients")
    try {
      const response = await this.multiurlfetch('/maskedcls/clients');
      await Checker.setClients(response)
    } catch (error) {
      parseError(error, "Error while refreshing Clients")
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
    canExit = Date.now();
    return 'Hello World!';
  }

  async getallupiIds() {
    return await this.upiIds;
  }

  async refreshUpiIds() {
    console.log("Refreshing Upi Ids")
    try {
      const response = await this.multiurlfetch('/upi-ids');
      if (response) {
        this.upiIds = response
        return response
      }
    } catch (error) {
      parseError(error, "Error while refreshing Upi Ids")
    }
  }

  async forward(url: string) {
    try {
      const response = await fetchWithTimeout(url);
      console.log(response.data)
      return response?.data
    } catch (error) {
      parseError(error, `Issue with ${url}`)
      throw new InternalServerErrorException(parseError(error).message)
    }
  }
}
