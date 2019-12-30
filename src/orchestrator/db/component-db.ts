import { LevelUp } from 'levelup';
import level from 'level-party';
import * as path from 'path';
import { COMPONENT_CACHE_ROOT } from '../../constants';

export default class ComponentDB {
  constructor(
    workspace: string,
    private db: LevelUp = level(
      path.join(COMPONENT_CACHE_ROOT, workspace.split(path.sep).join('_')),
      { valueEncoding: 'json' },
      {}
    )
  ) {}

  public async get(key: string): Promise<any> {
    try {
      const data = await this.db.get(key);
      return JSON.parse(data);
    } catch (error) {
      return Promise.resolve();
    }
  }

  public async put(key: string, val: string): Promise<void> {
    await this.db.put(key, val);
  }

  public async del(key: string): Promise<void> {
    await this.db.del(key);
  }

  public batch(ops: Array<{ type: string; key: string; value: string }>) {
    // @ts-ignore
    return this.db.batch(ops);
  }
  public keys(): Promise<any> {
    return new Promise((resolve, reject) => {
      const keys: Array<string> = [];
      this.db
        .createKeyStream()
        .on('data', function(data) {
          keys.push(data);
        })
        .on('error', function(err) {
          // console.log('Oh my!', err);
          reject(err);
        })
        .on('close', function() {})
        .on('end', function() {
          // console.log('Stream ended');
          return resolve(keys);
        });
    });
  }
}