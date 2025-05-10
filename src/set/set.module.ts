import { Module } from '@nestjs/common';
import { SetService } from './set.service';
import { SetController } from './set.controller';
import { Set, SetSchema } from 'src/set/schemas/set.schema';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [MongooseModule.forFeature([{ name: Set.name, schema: SetSchema }])],
  controllers: [SetController],
  providers: [SetService],
})
export class SetModule {}
