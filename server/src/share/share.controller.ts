import { Controller, Get, Param } from '@nestjs/common'
import { ShareService } from './share.service'

@Controller('share')
export class ShareController {
  constructor(private shareService: ShareService) {}

  @Get(':token')
  async getByToken(@Param('token') token: string) {
    return this.shareService.getByToken(token)
  }
}
