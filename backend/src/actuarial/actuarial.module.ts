import { Module } from '@nestjs/common';
import { ActuarialService } from './actuarial.service';

@Module({
  providers: [ActuarialService],
  exports: [ActuarialService],
})
export class ActuarialModule {}
