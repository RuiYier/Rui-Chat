import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
    logger: ['error', 'warn'],
  })

  // 配置 JSON body 大小限制为 5MB
  app.use(require('express').json({ limit: '5mb' }))
  app.use(require('express').urlencoded({ extended: true, limit: '5mb' }))

  app.setGlobalPrefix('api')

  // 从环境变量读取 CORS 配置
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:5173']

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )

  const port = process.env.PORT || 3000
  await app.listen(port)
  console.log(`Server running on http://localhost:${port}`)
}

bootstrap()
