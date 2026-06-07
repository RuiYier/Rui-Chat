import { Injectable, BadRequestException } from '@nestjs/common'

@Injectable()
export class UploadService {
  private readonly maxSize = 1 * 1024 * 1024 // 1MB
  private readonly allowedTypes = ['.txt', '.md']

  async processFile(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('请上传文件')
    }

    const ext = '.' + file.originalname.split('.').pop()?.toLowerCase()
    if (!this.allowedTypes.includes(ext)) {
      throw new BadRequestException('只支持 .txt 和 .md 文件')
    }

    if (file.size > this.maxSize) {
      throw new BadRequestException('文件大小不能超过 1MB')
    }

    const content = file.buffer.toString('utf-8')

    return {
      name: file.originalname,
      content,
      size: file.size,
    }
  }
}
