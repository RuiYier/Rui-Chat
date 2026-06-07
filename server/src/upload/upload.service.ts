import { Injectable, BadRequestException } from '@nestjs/common'

@Injectable()
export class UploadService {
  private readonly maxSize = 1 * 1024 * 1024 // 1MB
  private readonly allowedTypes = ['.txt', '.md']

  async processFile(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('请上传文件')
    }

    // Decode filename from Latin-1 to UTF-8 for Chinese characters
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf-8')

    const ext = '.' + originalName.split('.').pop()?.toLowerCase()
    if (!this.allowedTypes.includes(ext)) {
      throw new BadRequestException('只支持 .txt 和 .md 文件')
    }

    if (file.size > this.maxSize) {
      throw new BadRequestException('文件大小不能超过 1MB')
    }

    const content = file.buffer.toString('utf-8')

    return {
      name: originalName,
      content,
      size: file.size,
    }
  }
}
