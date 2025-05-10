import { Global, Module } from '@nestjs/common';
import { HelperService } from './helper/helper.service';

@Global()
@Module({
  providers: [HelperService],
  exports: [HelperService],
})
export class CommonModule {}
