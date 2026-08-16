import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'

/**
 * 管理员权限守卫：需搭配 JwtAuthGuard 使用（@UseGuards(JwtAuthGuard, AdminGuard)），
 * 仅校验 req.user.role === 'admin'，认证由 JwtAuthGuard 完成
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    if (request.user?.role !== 'admin') {
      throw new ForbiddenException('需要管理员权限')
    }
    return true
  }
}
