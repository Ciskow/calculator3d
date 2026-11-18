const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dec2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const loose = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const pct = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });

// Usa o sinal de menos tipográfico e evita "-R$ 0,00" para valores que arredondam a zero.
const tidy = (v: number) => (Math.abs(v) < 0.005 ? 0 : v);

/** R$ 18,19 */
export const fmtBRL = (v: number) => brl.format(tidy(v)).replace('-', '−');
/** 18,19 (sem símbolo, para tabelas densas) */
export const fmtMoney = (v: number) => dec2.format(tidy(v)).replace('-', '−');
/** 12,5 */
export const fmtNum = (v: number) => loose.format(v).replace('-', '−');
/** 33,5% (recebe fração) */
export const fmtPct = (v: number) => pct.format(Math.abs(v) < 0.0005 ? 0 : v).replace('-', '−');
