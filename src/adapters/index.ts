import { BocomCreditAdapter } from './bocom-credit';
import { CmbCreditAdapter } from './cmb-credit'
import { CmbDebitAdapter } from './cmb-debit'
import { Adapter } from './types';
import { compareKey } from '../utils';

export const AdapterList = [
  CmbCreditAdapter,
  CmbDebitAdapter,
  BocomCreditAdapter,
].sort(
  (a, b) => compareKey(a.key, b.key)
);

export const AdapterKeys = AdapterList.map((a) => a.key);

export const AdapterMap = AdapterList.reduce<Record<Adapter['key'], Adapter>>(
  (pre, cur) => {
    pre[cur.key] = cur;
    return pre;
  },
  {}
);
