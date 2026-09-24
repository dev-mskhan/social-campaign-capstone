import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import sharp from 'sharp';
import { ImagePipelineService } from '../src/modules/content/image-pipeline.service';

describe('Image Variant Pipeline Tests (Sharp)', () => {
  const testUploadsDir = path.resolve(process.cwd(), 'uploads', 'test_variants');
  let service: ImagePipelineService;

  beforeAll(() => {
    service = new ImagePipelineService(testUploadsDir);
  });

  afterAll(() => {
    if (fs.existsSync(testUploadsDir)) {
      fs.rmSync(testUploadsDir, { recursive: true, force: true });
    }
  });

  it('should generate Instagram variant with exact 1080x1080 dimensions (1:1 ratio)', async () => {
    const result = await service.generateVariant('Test Image', 'instagram', 'camp_test_1');

    expect(result.platform).toBe('instagram');
    expect(result.width).toBe(1080);
    expect(result.height).toBe(1080);
    expect(fs.existsSync(result.filePath)).toBe(true);

    const metadata = await sharp(result.filePath).metadata();
    expect(metadata.width).toBe(1080);
    expect(metadata.height).toBe(1080);
    expect(metadata.format).toBe('jpeg');
  });

  it('should generate X variant with exact 1600x900 dimensions (16:9 ratio)', async () => {
    const result = await service.generateVariant('Test Image', 'x', 'camp_test_2');

    expect(result.platform).toBe('x');
    expect(result.width).toBe(1600);
    expect(result.height).toBe(900);
    expect(fs.existsSync(result.filePath)).toBe(true);

    const metadata = await sharp(result.filePath).metadata();
    expect(metadata.width).toBe(1600);
    expect(metadata.height).toBe(900);
    expect(metadata.format).toBe('jpeg');
  });
});
