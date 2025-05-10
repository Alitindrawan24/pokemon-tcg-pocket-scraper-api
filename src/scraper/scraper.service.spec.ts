import { Test, TestingModule } from '@nestjs/testing';
import { ScraperService } from './scraper.service';
import { HelperService } from 'src/common/helper/helper.service';
import { getModelToken } from '@nestjs/mongoose';

const mockCardModel = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  updateOne: jest.fn(),
};

const mockSetModel = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
};

const mockHelperService = {};

describe('ScraperService', () => {
  let service: ScraperService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScraperService,
        {
          provide: getModelToken('Card'), // Must match @InjectModel(Card.name)
          useValue: mockCardModel,
        },
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

    service = module.get<ScraperService>(ScraperService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
