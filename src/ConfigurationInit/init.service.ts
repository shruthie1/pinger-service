import { Injectable, OnModuleInit } from '@nestjs/common';
import { fetchWithTimeout, parseError, ppplbot } from 'src/utils';
import { uptimechecker } from 'src/utils/constants';
@Injectable()
export class ConfigurationService implements OnModuleInit {
    constructor() {
    }
    async onModuleInit() {
        console.log("Config Module Inited");
        await this.setEnv()
    }

    async findOne(): Promise<any> {
        try {
            const response = await fetchWithTimeout(`https://api.npoint.io/cc57d60feea67e47b6c4`);
            return response.data  
        } catch (error) {
            await fetchWithTimeout(`${ppplbot()}&text=Failed to Fetch Envs: Exitting Pinger Service`);
        }
    }

    async setEnv() {
        console.log("Setting Envs");
        const data = await this.findOne()
        for (const key in data) {
            console.log('setting', key)
            if (key !== "PORT") {
                process.env[key] = data[key];
            }
        }
        console.log("finished setting env");
    }
}
