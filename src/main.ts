import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { fetchWithTimeout } from './fetchWithTimeout';
import { notifbot } from './utils/logbots';
import { parseError } from './utils/parseError';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
    next();
  });

  app.enableCors({
    allowedHeaders: "*",
    origin: "*"
  });
  app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
  }));
  const config = new DocumentBuilder()
    .setTitle('NestJS and Express API')
    .setDescription('API documentation')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  // fs.writeFileSync('./swagger-spec.json', JSON.stringify(document, null, 2));
  SwaggerModule.setup('api', app, document);

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (reason, promise) => {
    console.error(promise, reason);
  });

  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`${signal} received`);
    await app.close();
    process.exit(0);
  };

  process.on('exit', async () => {
    console.log('Application closed');
  });

  process.on('SIGINT', async () => {
    await shutdown('SIGINT');
  });

  process.on('SIGTERM', async () => {
    await shutdown('SIGTERM');
  });

  process.on('SIGQUIT', async () => {
    await shutdown('SIGQUIT');
  });

  await app.init();
  await app.listen(process.env.PORT || 9000);
}
bootstrap();

process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific logging, throwing an error, or other logic here
  fetchWithTimeout(`${notifbot(process.env.accountsChannel)}&text=Unhandled Promise Rejection ${JSON.stringify(reason)}`);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  parseError(error, "Uncaught Exception")
});