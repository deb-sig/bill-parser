import React, { useState } from 'react';

import CmbCredit from './cmb-credit';
import CmbDebit from './cmb-debit';
import BocomCredit from './bocom-credit';

type BillType = 
  | 'cmb_debit' 
  | 'cmb_credit'
  | 'bocom_credit';

const BillTypeList: BillType[] = [
  'cmb_debit',
  'cmb_credit',
  'bocom_credit',
];

const BillTypeCompMap: Record<BillType, React.FC> = {
  'cmb_debit': CmbDebit,
  'cmb_credit': CmbCredit,
  'bocom_credit': BocomCredit,
}

const Index: React.FC = () => {
  const [billType, setBillType] = useState<BillType>('cmb_debit');
  const Comp = BillTypeCompMap[billType];

  return (
    <div className="flex flex-col">
      {BillTypeList.map(t => (
        <p onClick={() => setBillType(t)}>{t} {billType === t ? '(selected)' : ''}</p>
      ))}
      <Comp />
    </div>
  );
}

export default Index;
