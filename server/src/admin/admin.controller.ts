import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { AdminService } from './admin.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { AdminGuard } from '../common/guards/admin.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { CreateProviderDto } from './dto/create-provider.dto'
import { UpdateProviderDto } from './dto/update-provider.dto'
import { CreateModelDto } from './dto/create-model.dto'
import { UpdateModelDto } from './dto/update-model.dto'
import { UpdateSettingsDto } from './dto/update-settings.dto'

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  // ========== 统计 ==========

  @Get('stats')
  getStats() {
    return this.adminService.getStats()
  }

  // ========== 用户管理 ==========

  @Get('users')
  listUsers() {
    return this.adminService.listUsers()
  }

  @Post('users')
  create(@Body() dto: CreateUserDto) {
    return this.adminService.createUser(dto)
  }

  @Patch('users/:id')
  updateUser(
    @Param('id') id: string,
    @CurrentUser('id') actorId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.adminService.updateUser(id, actorId, dto)
  }

  @Delete('users/:id')
  deleteUser(
    @Param('id') id: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.adminService.deleteUser(id, actorId)
  }

  // ========== 提供商管理 ==========

  @Get('providers')
  listProviders() {
    return this.adminService.listProviders()
  }

  @Post('providers')
  createProvider(@Body() dto: CreateProviderDto) {
    return this.adminService.createProvider(dto)
  }

  @Patch('providers/:id')
  updateProvider(@Param('id') id: string, @Body() dto: UpdateProviderDto) {
    return this.adminService.updateProvider(id, dto)
  }

  @Delete('providers/:id')
  deleteProvider(@Param('id') id: string) {
    return this.adminService.deleteProvider(id)
  }

  // ========== 模型管理 ==========

  @Post('models')
  createModel(@Body() dto: CreateModelDto) {
    return this.adminService.createModel(dto)
  }

  @Patch('models/:id')
  updateModel(@Param('id') id: string, @Body() dto: UpdateModelDto) {
    return this.adminService.updateModel(id, dto)
  }

  @Delete('models/:id')
  deleteModel(@Param('id') id: string) {
    return this.adminService.deleteModel(id)
  }

  // ========== 系统设置 ==========

  @Get('settings')
  getSettings() {
    return this.adminService.getSettings()
  }

  @Patch('settings')
  updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.adminService.updateSettings(dto)
  }
}
