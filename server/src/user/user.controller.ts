import { Controller, Patch, Body, UseGuards } from '@nestjs/common'
import { UserService } from './user.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'

@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @Patch('api-key')
  @UseGuards(JwtAuthGuard)
  async updateApiKey(@CurrentUser('id') userId: string, @Body('apiKey') apiKey: string) {
    return this.userService.updateApiKey(userId, apiKey)
  }
}
