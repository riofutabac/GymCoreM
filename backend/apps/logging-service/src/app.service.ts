import { Injectable } from '@nestjs/common';
import { AppElasticsearchService } from './elasticsearch.service';
import { CreateLogDto } from './dto/log.dto';

@Injectable()
export class AppService {
  constructor(private readonly elasticsearchService: AppElasticsearchService) {}

  async handleLog(log: CreateLogDto) {
    return this.elasticsearchService.indexLog(log);
  }
}