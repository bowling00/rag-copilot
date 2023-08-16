import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Inject,
  LoggerService,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { JwtGuard } from 'src/guards/jwt.guard';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MessageService } from './message.service';

@ApiTags('消息')
@UseInterceptors(ClassSerializerInterceptor)
@Controller('message')
export class MessageController {
  constructor(
    private messageService: MessageService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @ApiOperation({ summary: '获取消息详情' })
  @ApiResponse({ status: 200, description: '成功获取消息资料' })
  @Get(':id/detail')
  get(@Query('id') id: string) {
    return this.messageService.get(id);
  }

  @ApiOperation({ summary: '获取消息列表' })
  @ApiResponse({ status: 200, description: '成功获取消息列表' })
  @Get(':conversationId/list')
  async getAll(@Query('conversationId') conversationId: string) {
    const data = await this.messageService.getAll(conversationId);
    return {
      data,
    };
  }

  @ApiOperation({ summary: '创建消息' })
  @Post()
  create(@Body() createMessageDto: CreateMessageDto) {
    return this.messageService.create(createMessageDto);
  }

  @ApiOperation({ summary: '更新项目信息' })
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @Patch('')
  update(@Body() updateMessageDto: UpdateMessageDto) {
    return this.messageService.update(updateMessageDto);
  }

  @ApiOperation({ summary: '删除消息' })
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.messageService.delete(id);
  }
}