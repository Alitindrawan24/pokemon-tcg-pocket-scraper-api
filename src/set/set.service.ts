import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { Set } from 'src/set/schemas/set.schema';
import { HelperService } from 'src/common/helper/helper.service';
import { FindSetDto } from './dto/find-set.dto';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class SetService {
  constructor(
    @InjectModel(Set.name) private setModel: Model<Set>,
    private readonly helperService: HelperService,
  ) {}
  async findAll(findSetDto: FindSetDto) {
    return await this.setModel
      .find({
        ...(findSetDto.code && {
          code: { $regex: new RegExp(findSetDto.code, 'i') },
        }),
      })
      .sort({
        order: 1,
      });
  }

  async findOne(code: string) {
    return await this.setModel
      .findOne({
        code: code,
      })
      .exec();
  }
}
