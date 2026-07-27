import { ConfigService } from '@nestjs/config';
import { createApp } from './bootstrap';

async function bootstrap() {
  const app = await createApp();
  const config = app.get(ConfigService);
  const port = config.get<number>('port') || 3001;
  await app.listen(port);
  console.log(`CurrencyIQ backend running on http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
