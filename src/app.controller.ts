import { Controller, Get, Param, Query, Req, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('clients')
  getClients() {
    return this.appService.getClients();
  }

  @Get('refreshMap')
  refreshMap() {
    return this.appService.refreshClients();
  }

  @Get("exit")
  exit(): string {
    process.exit(1)
  }

  @Get('/tgclientoff/:processId')
  @ApiOperation({ summary: 'Get client off by process ID' })
  @ApiResponse({ status: 200, description: 'Request processed successfully.' })
  async getClientOff(@Param('processId') processId: string, @Query('clientId') clientId: string): Promise<boolean> {
    return await this.appService.getClientOff(clientId, processId);
  }

  @Get('/receive')
  @ApiOperation({ summary: 'Receive ping' })
  @ApiResponse({ status: 200, description: 'Ping received successfully.' })
  async receivePing(@Query('clientId') clientId: string): Promise<void> {
    await this.appService.receivePing(clientId);
  }

  @Get('/requestcall')
  @ApiOperation({ summary: 'Request call' })
  @ApiResponse({ status: 200, description: 'Call request processed successfully.' })
  async requestCall(@Query('clientId') clientId: string, @Query('chatId') chatId: string, @Query('type') type: string): Promise<void> {
    return await this.appService.requestCall(clientId, chatId, type);
  }

  @Get('/getallupiIds')
  @ApiOperation({ summary: 'Get all UpiIDs' })
  @ApiResponse({ status: 200, description: 'All upi Ids retrieved successfully.' })
  async getallupiIds() {
    return await this.appService.getallupiIds();
  }

  @Get('forward/*')
  async forwardRequest(@Query('host') host: string, @Req() req: Request, @Res() res: Response) {
    let targetHost = process.env.tgcms;
    if (host) {
      targetHost = host;
    }
    console.log(req.url);
    const finalUrl = `${targetHost}${req.url.replace('/forward', '')}`;
    console.log('final:', finalUrl);
    const response = await this.appService.forward(finalUrl);
    return response

  }
}
