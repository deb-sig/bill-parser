export type BillType = 
  | 'cmb_debit' 
  | 'cmb_credit'
  | 'bocom_credit';

export const BillTypeList: BillType[] = [
  'cmb_debit',
  'cmb_credit',
  'bocom_credit',
];

export const BillTypeTextMap: Record<BillType, string> = {
  cmb_debit: '招商银行储蓄卡',
  cmb_credit: '招商银行信用卡',
  bocom_credit: '交通银行信用卡',
};
