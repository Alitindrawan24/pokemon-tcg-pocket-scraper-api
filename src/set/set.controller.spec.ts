import { Test, TestingModule } from '@nestjs/testing';
import { SetController } from './set.controller';
import { SetService } from './set.service';

describe('SetController', () => {
  let controller: SetController;

  beforeEach(async () => {
    const mockSetService = {};

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SetController],
      providers: [
        {
          provide: SetService,
          useValue: mockSetService,
        },
      ],
    }).compile();

    controller = module.get<SetController>(SetController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
