import { Global, Module } from "@nestjs/common";
import { ConfigurationService } from "./init.service";


@Global()
@Module({
  imports: [],
  providers: [ConfigurationService],
  exports: [initModule],
})
export class initModule {
  constructor() { }
}