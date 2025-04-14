import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { Data, CreateDataDto, UpdateDataDto } from '../models/data.model';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DataService {
  private readonly dataPath = join(process.cwd(), 'data', 'data.json');

  constructor() {
    this.initializeDataFile();
  }

  private async initializeDataFile() {
    try {
      await fs.access(this.dataPath);
    } catch {
      await fs.writeFile(this.dataPath, JSON.stringify([]));
    }
  }

  private async readData(): Promise<Data[]> {
    const data = await fs.readFile(this.dataPath, 'utf8');
    return JSON.parse(data);
  }

  private async writeData(data: Data[]): Promise<void> {
    await fs.writeFile(this.dataPath, JSON.stringify(data, null, 2));
  }

  async findAll(): Promise<Data[]> {
    return this.readData();
  }

  async findOne(id: string): Promise<Data | null> {
    const data = await this.readData();
    return data.find(item => item.id === id) || null;
  }

  async create(createDataDto: CreateDataDto): Promise<Data> {
    const data = await this.readData();
    const newData: Data = {
      id: uuidv4(),
      ...createDataDto,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    data.push(newData);
    await this.writeData(data);
    return newData;
  }

  async update(id: string, updateDataDto: UpdateDataDto): Promise<Data | null> {
    const data = await this.readData();
    const index = data.findIndex(item => item.id === id);
    if (index === -1) return null;

    data[index] = {
      ...data[index],
      ...updateDataDto,
      updatedAt: new Date(),
    };
    await this.writeData(data);
    return data[index];
  }

  async remove(id: string): Promise<boolean> {
    const data = await this.readData();
    const initialLength = data.length;
    const filteredData = data.filter(item => item.id !== id);
    if (filteredData.length === initialLength) return false;
    
    await this.writeData(filteredData);
    return true;
  }
} 