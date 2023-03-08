import { getPaginationOpts, getArgs } from '../src';

describe('getOpts', () => {
  it('should throw an error if next not a number', async () => {
    const args = getArgs([`--next=oops`], { '--next': Number });
    expect(() => {
      getPaginationOpts(args);
    }).toThrowError();
  });

  it('should throw an error if limit not valid', async () => {
    for (const limit of ['abc', '101', '1.1', '-1']) {
      const args = getArgs([`--limit=${limit}`], { '--limit': Number });
      expect(() => {
        getPaginationOpts(args);
      }).toThrowError();
    }
  });
});
