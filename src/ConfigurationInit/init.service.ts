import { Injectable, OnModuleInit } from '@nestjs/common';
import { fetchWithTimeout } from 'src/utils';
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
        const response = await fetchWithTimeout(`${uptimechecker}/configuration`);
        return response.data
    }

    async setEnv() {
        console.log("Setting Envs");
        const data = await this.findOne()
        for (const key in data) {
            console.log('setting', key)
            process.env[key] = data[key];
        }
        console.log("finished setting env");
    }
}
