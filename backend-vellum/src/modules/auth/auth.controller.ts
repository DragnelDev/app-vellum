import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto, OlvideDto, RegistroDto, RestablecerDto } from './auth.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('registro')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  registro(@Body() dto: RegistroDto) {
    return this.auth.registro(dto);
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('olvide')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  olvide(@Body() dto: OlvideDto) {
    return this.auth.olvide(dto);
  }

  @Post('restablecer')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  restablecer(@Body() dto: RestablecerDto) {
    return this.auth.restablecer(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}
