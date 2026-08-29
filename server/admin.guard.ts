import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<any>();
    if (!req.user?.id) throw new UnauthorizedException("Authentication required");
    if (req.user.role !== "admin") throw new ForbiddenException("Administrator privileges required");
    return true;
  }
}
