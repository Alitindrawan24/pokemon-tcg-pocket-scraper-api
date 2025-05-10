import { Test, TestingModule } from '@nestjs/testing';
import { SetService } from './set.service';
import { getModelToken } from '@nestjs/mongoose';
import { HelperService } from 'src/common/helper/helper.service';

const mockSetModel = {};

const mockHelperService = {};

describe('SetService', () => {
  let service: SetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SetService,
        {
          provide: getModelToken('Set'), // Must match @InjectModel(Set.name)
          useValue: mockSetModel,
        },
        {
          provide: HelperService,
          useValue: mockHelperService,
        },
      ],
    }).compile();

    service = module.get<SetService>(SetService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
