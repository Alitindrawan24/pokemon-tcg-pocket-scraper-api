import { Test, TestingModule } from '@nestjs/testing';
import { CardService } from './card.service';
import { getModelToken } from '@nestjs/mongoose';
import { HelperService } from 'src/common/helper/helper.service';

const mockCardModel = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  updateOne: jest.fn(),
};

const mockHelperService = {};

describe('CardService', () => {
  let service: CardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardService,
        {
          provide: getModelToken('Card'), // Must match @InjectModel(Card.name)
          useValue: mockCardModel,
        },
        {
          provide: HelperService,
          useValue: mockHelperService,
        },
      ],
    }).compile();

    service = module.get<CardService>(CardService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
