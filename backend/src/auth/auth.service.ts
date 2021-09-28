import { User } from '.prisma/client';
import {
  Injectable,
  HttpException,
  HttpStatus,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { JwtPayload } from './jwt.strategy';
import { JwtService } from '@nestjs/jwt';
import { PrismaClientValidationError } from '@prisma/client/runtime';
import * as bcrypt from 'bcrypt';

export type RegistrationStatus = {
  success: boolean;
  message: string;
};

export type LoginInfo = {
  username: string;
  password: string;
};

export type LoginResult = {
  token: string;
  user: User;
};

export const RequestUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    delete request.user.password;
    return request.user;
  },
);

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async register(userData: User): Promise<RegistrationStatus> {
    let status: RegistrationStatus = {
      success: true,
      message: 'user registered',
    };

    try {
      await this.userService.create(userData);
    } catch (e) {
      if (e instanceof PrismaClientValidationError) {
        if ((e as any).code == 'P1012')
          status = {
            success: false,
            message: 'Missing required fields',
          };
        else if ((e as any).code == 'P2002')
          status = {
            success: false,
            message: 'Unique constraint violation',
          };
        else
          status = {
            success: false,
            message: e.message,
          };
      } else {
        status = {
          success: false,
          message: e.message,
        };
      }
    }

    return status;
  }

  async login(userData: LoginInfo): Promise<LoginResult> {
    const user = await this.getAuthenticatedUser(
      userData.username,
      userData.password,
    );
    const token = this._createToken(user);

    return {
      user,
      ...token,
    };
  }

  public async getAuthenticatedUser(
    username: string,
    plainTextPassword: string,
  ) {
    try {
      const user = await this.userService.find({ username });
      await this.verifyPassword(plainTextPassword, user.password);
      delete user.password;
      return user;
    } catch (error) {
      throw new HttpException(
        'Wrong credentials provided',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async verifyPassword(
    plainTextPassword: string,
    hashedPassword: string,
  ) {
    const isPasswordMatching = await bcrypt.compare(
      plainTextPassword,
      hashedPassword,
    );
    if (!isPasswordMatching) {
      throw new HttpException(
        'Wrong credentials provided',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async validateUser(payload: JwtPayload): Promise<User> {
    const user = await this.userService.find({ username: payload.username });
    if (!user) {
      throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
    }
    return user;
  }

  private _createToken({ username }: User): any {
    const expiresIn = process.env.EXPIRESIN;

    const user = { username };
    const accessToken = this.jwtService.sign(user);
    return {
      expiresIn,
      accessToken,
    };
  }
}
