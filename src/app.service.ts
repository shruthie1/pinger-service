import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import axios from 'axios'
import { uptimechecker } from './utils/constants';
import { fetchWithTimeout, parseError, ppplbot, sleep } from './utils';
import { Checker } from './CheckerClass';
import * as schedule from 'node-schedule-tz';
console.log("In App Service")

@Injectable()
export class AppService implements OnModuleInit {
  private upiIds;
  constructor() {
    try {

      schedule.scheduleJob('test2', '*/10 * * * *', 'Asia/Kolkata', async () => {
        await this.refreshClients();
        await this.refreshUpiIds();
      })

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
    console.log("Added All Cron Jobs");
  }
  async onModuleInit() {
    await this.refreshClients()
    await this.refreshUpiIds();
    await fetchWithTimeout(`${ppplbot()}&text=Refreshed Map :: PingerService`);
  }

  async refreshClients() {
    console.log("Refreshing clients")
    try {
      const response = await axios.get(`${uptimechecker}/maskedcls`);
      await Checker.setClients(response.data)
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

  async getallupiIds() {
    return await this.upiIds;
  }

  async refreshUpiIds() {
    console.log("Refreshing Upi Ids")
    try {
      const response = await axios.get(`${uptimechecker}/upi-ids`);
      this.upiIds = response.data
      return response.data
    } catch (error) {
      parseError(error)
    }
  }

  async forward(url: string) {
    try {
      const response = await axios.get(url, { timeout: 55000 });
      return response;
    } catch (error) {
      parseError(error, `Issue with ${url}`)
      throw new InternalServerErrorException(parseError(error).message)
    }
  }
}
