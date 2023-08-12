import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  Put,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UpdateUserDto } from './dto/update-user.dto';
import * as argon2 from 'argon2';
import { getUserDto } from './dto/get-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { InjectRedis, Redis } from '@nestjs-modules/ioredis';
import { PrismaService } from 'nestjs-prisma';
import { getServerConfig } from 'src/utils';
import { User, ProfileGenderEnum } from '@prisma/client';
import { RolesEnum, UserInput } from './dto/user.input';
@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis,
    private configService: ConfigService
  ) {}

  async create(user: Partial<UserInput>) {
    const { username, email, password } = user;

    // 重名检测
    const userByUsername = await this.prisma.user.findUnique({
      where: { username },
    });

    if (userByUsername) {
      throw new ForbiddenException('用户名已存在');
    }

    if (email) {
      // 邮箱重复检测
      const userByEmail = await this.prisma.user.findUnique({
        where: { email },
      });

      if (userByEmail) {
        throw new ForbiddenException('邮箱已存在，可找回密码');
      }
    }

    const hashedPassword = password ? await argon2.hash(password) : undefined;
    const profile = {
      ...user.profile,
      gender: ProfileGenderEnum.other,
    };
    const createdUser = await this.prisma.user.create({
      // @ts-ignore
      data: {
        ...user,
        password: hashedPassword,
        profile: {
          create: profile,
        },
      },
      include: {
        profile: true,
      },
    });

    return createdUser;
  }

  async findAll(query: getUserDto) {
    const { limit, page, username, email, gender, role } = query;
    const take = limit || 10;
    const skip = ((page || 1) - 1) * take;

    const users = await this.prisma.user.findMany({
      include: {
        profile: true,
        users_roles: {
          include: { roles: true },
        },
      },
      where: {
        username,
        email,
        profile: {
          gender,
        },
        users_roles: {
          some: {
            role_id: role,
          },
        },
      },
      take,
      skip,
    });

    const total = await this.prisma.user.count({
      where: {
        username,
        email,
        profile: {
          gender,
        },
        users_roles: {
          some: {
            role_id: role,
          },
        },
      },
    });

    const totalPages = Math.ceil(total / limit);
    return { data: users, total, totalPages };
  }

  // ...

  find(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
      include: { users_roles: true },
    });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { users_roles: true, profile: true },
    });
  }

  findByGithubId(github_id: string) {
    return this.prisma.user.findUnique({
      where: { github_id },
      include: { users_roles: true, profile: true },
    });
  }

  findOneById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const userTemp = await this.prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });

    if (!userTemp) {
      throw new NotFoundException('用户不存在');
    }

    const { address, description, gender, avatar, photo } = updateUserDto;

    return this.prisma.user.update({
      where: { id },
      data: {
        ...updateUserDto,
        profile: {
          update: {
            ...(address && { address }),
            ...(description && { description }),
            ...(gender && { gender }),
            ...(avatar && { avatar }),
            ...(photo && { photo }),
          },
        },
      },
      include: { profile: true },
    });
  }

  async updatePassword(passwordDto: UpdatePasswordDto) {
    const { email, code, password } = passwordDto;
    const user = await this.prisma.user.findUnique({ where: { email } });

    const getCode = await this.redis.get(`${email}_code`);
    if (!code || code !== getCode) {
      throw new ForbiddenException('验证码已过期');
    } else {
      this.redis.del(`${email}_code`);
    }

    const hashedPassword = await argon2.hash(password);

    return this.prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });
  }

  async remove(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }

  async findProfile(id: string) {
    const userInfo = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
      },
    });

    if (!userInfo) {
      throw new NotFoundException('用户不存在');
    }

    return userInfo;
  }

  // 对于复杂的查询，您可能需要使用 Prisma 的原生 SQL 查询
  // 或者使用 Prisma 提供的 API 来构造相同的查询。
  // findLogByGroup 方法可能需要进一步调整。

  async createAdminAccount() {
    const config = getServerConfig(); // 确保这个方法是可用的
    const adminEmail = config['user'] as string;
    const adminUserName = 'docs-copilot-root';
    const adminPassword = config['DB_PASSWORD'] as string;

    const existingAdmin = await this.prisma.user.findUnique({
      where: { email: adminEmail },
    });
    if (!existingAdmin) {
      const adminData = {
        username: adminUserName,
        email: adminEmail,
        password: adminPassword,
        users_roles: [RolesEnum.super],
      };

      try {
        await this.create(adminData);
        console.log('Admin account created successfully');
      } catch (error) {
        console.log('Failed to create admin account: ', error.message);
      }
    }
  }
}