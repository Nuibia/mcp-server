import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { DataService, CreateDataDto, UpdateDataDto } from '../services/data.service';

@Controller('api/data')
export class DataController {
  constructor(private readonly dataService: DataService) {}

  @Get()
  async findAll() {
    try {
      return await this.dataService.findAll();
    } catch (error) {
      throw new HttpException('获取数据失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const data = await this.dataService.findOne(id);
      if (!data) {
        throw new HttpException('数据不存在', HttpStatus.NOT_FOUND);
      }
      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('获取数据失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
  async create(@Body() createDataDto: CreateDataDto) {
    try {
      return await this.dataService.create(createDataDto);
    } catch (error) {
      throw new HttpException('创建数据失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDataDto: UpdateDataDto) {
    try {
      const data = await this.dataService.update(id, updateDataDto);
      if (!data) {
        throw new HttpException('数据不存在', HttpStatus.NOT_FOUND);
      }
      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('更新数据失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const result = await this.dataService.remove(id);
      if (!result) {
        throw new HttpException('数据不存在', HttpStatus.NOT_FOUND);
      }
      return { message: '删除成功' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('删除数据失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
