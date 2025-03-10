import PostalMime from 'postal-mime';
import { Adapter } from '../types';

const convertFromEml = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const typedArray = new Uint8Array(event.target?.result as ArrayBuffer);
        const email = await PostalMime.parse(typedArray);
        console.log('eml', email.html)
        const parser = new DOMParser();
        const doc = parser.parseFromString(email.html || "", 'text/html');
        console.log(doc)

        resolve('');
      } catch (error) {
        reject(error);
      }
    };

    reader.readAsArrayBuffer(file);
  });
};

export const BocomCreditAdapter: Adapter = {
  key: 'bocom_credit',
  name: '交通银行信用卡',
  sourceFileFormat: ['eml'],
  converter: convertFromEml,
}
