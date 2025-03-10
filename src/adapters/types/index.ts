export type PromiseValue<T> = T extends Promise<infer U> ? U : T;

export type SourceFileFormat = 'pdf' | 'eml';

export interface Adapter {
  /**
   * 唯一 id（cmb_debit/bocom_credit/...）
   */
  key: string;
  /**
   * 名称（招商银行储蓄卡/交通银行信用卡/...）
   */
  name: string;
  /**
   * 源文件格式（pdf/eml/...）
   */
  sourceFileFormat: SourceFileFormat[];
  /**
   * 转换器函数
   * @param source 源文件
   * @returns 转换完成的 CSV 字符串
   */
  converter: (source: File) => Promise<string>;
}
