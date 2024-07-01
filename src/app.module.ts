import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { initModule } from './ConfigurationInit/init.module';

@Module({
  imports: [initModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
