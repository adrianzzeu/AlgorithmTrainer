import React, { useMemo, useState } from 'react';
import { ChevronRight, Cpu, Play, RotateCcw } from 'lucide-react';
import HoverInfo from '../components/ui/HoverInfo';
import {
  addBinaryStr,
  c2ToInt,
  getCountStr,
  intToC2,
  requiredBitsForUnsignedInt,
} from '../utils/binaryHelpers';

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm outline-none transition ' +
  'focus:border-slate-400 focus:ring-0 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-100';

const iconButtonClass =
  'rounded-xl border border-slate-200 bg-white/80 p-2 text-slate-700 transition hover:bg-slate-100 ' +
  'disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-200 dark:hover:bg-slate-900';

const primaryButtonClass =
  'rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 text-white transition hover:bg-slate-800 ' +
  'disabled:opacity-40 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white';

const toggleButtonClass = (active) =>
  `rounded-xl px-3 py-2 text-sm font-medium transition-all ${
    active
      ? 'bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900'
      : 'border border-slate-200 bg-white/80 text-slate-700 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300'
  }`;

const RADIX4_SELECTION_TABLE = {
  8: [
    { min: -12, max: -7, q: -2 },
    { min: -6, max: -3, q: -1 },
    { min: -2, max: 1, q: 0 },
    { min: 2, max: 5, q: 1 },
    { min: 6, max: 11, q: 2 },
  ],
  9: [
    { min: -14, max: -8, q: -2 },
    { min: -7, max: -3, q: -1 },
    { min: -3, max: 2, q: 0 },
    { min: 2, max: 6, q: 1 },
    { min: 7, max: 13, q: 2 },
  ],
  10: [
    { min: -15, max: -9, q: -2 },
    { min: -8, max: -3, q: -1 },
    { min: -3, max: 2, q: 0 },
    { min: 2, max: 7, q: 1 },
    { min: 8, max: 14, q: 2 },
  ],
  11: [
    { min: -16, max: -9, q: -2 },
    { min: -9, max: -3, q: -1 },
    { min: -3, max: 2, q: 0 },
    { min: 2, max: 8, q: 1 },
    { min: 8, max: 15, q: 2 },
  ],
  12: [
    { min: -18, max: -10, q: -2 },
    { min: -10, max: -4, q: -1 },
    { min: -4, max: 3, q: 0 },
    { min: 3, max: 9, q: 1 },
    { min: 9, max: 17, q: 2 },
  ],
  13: [
    { min: -19, max: -11, q: -2 },
    { min: -10, max: -4, q: -1 },
    { min: -4, max: 3, q: 0 },
    { min: 3, max: 9, q: 1 },
    { min: 10, max: 18, q: 2 },
  ],
  14: [
    { min: -20, max: -11, q: -2 },
    { min: -11, max: -4, q: -1 },
    { min: -4, max: 3, q: 0 },
    { min: 3, max: 10, q: 1 },
    { min: 10, max: 19, q: 2 },
  ],
  15: [
    { min: -22, max: -12, q: -2 },
    { min: -12, max: -4, q: -1 },
    { min: -5, max: 4, q: 0 },
    { min: 3, max: 11, q: 1 },
    { min: 11, max: 21, q: 2 },
  ],
};

const getMaxRadix4Quotient = (bits) => (2 * (4 ** (bits / 2) - 1)) / 3;

const normalizeSrt4Bits = (bits) => {
  const safeBits = Math.max(6, bits);
  return safeBits % 2 === 0 ? safeBits : safeBits + 1;
};

const chooseSrt4Bits = (dividend, divisor) => {
  const safeDivisor = Math.max(1, divisor);
  const quotientEstimate = Math.floor(Math.max(0, dividend) / safeDivisor);
  let bits = normalizeSrt4Bits(
    Math.max(requiredBitsForUnsignedInt(dividend), requiredBitsForUnsignedInt(divisor))
  );

  while (getMaxRadix4Quotient(bits) < quotientEstimate) {
    bits += 2;
  }

  return bits;
};

const toUnsignedBinary = (value, bits) =>
  Math.max(0, value).toString(2).padStart(bits, '0').slice(-bits);

const countLeadingZeros = (bitStr) => {
  let count = 0;
  while (count < bitStr.length && bitStr[count] === '0') count++;
  return count;
};

const shiftLeftBits = (bitStr, amount) =>
  amount <= 0 ? bitStr : bitStr.slice(amount) + '0'.repeat(amount);

const shiftLeftPair = (left, right, amount = 1) => {
  const combined = left + right;
  const shifted = combined.slice(amount) + '0'.repeat(amount);

  return {
    left: shifted.slice(0, left.length),
    right: shifted.slice(left.length),
  };
};

const getTopSignedBits = (bitStr, count) =>
  bitStr.length >= count ? bitStr.slice(0, count) : bitStr[0].repeat(count - bitStr.length) + bitStr;

const formatRadix4Digit = (digit) => {
  if (digit === -2) return '-2';
  if (digit === -1) return '-1';
  return String(digit);
};

const formatRadix4Sequence = (digits) => digits.map(formatRadix4Digit).join(' ');

const formatRadix4WeightedSum = (digits) => {
  const terms = digits
    .map((digit, index) => {
      if (digit === 0) return null;
      const power = digits.length - 1 - index;
      return `${digit}*4^${power}`;
    })
    .filter(Boolean);

  if (terms.length === 0) return '0';

  return terms.join(' + ').replace(/\+ -/g, '- ');
};

const renderBits = (bitStr) =>
  bitStr.split('').map((bit, index) => (
    <span key={`${bitStr}-${index}`} className="inline-block w-4 text-center">
      {bit}
    </span>
  ));

const getLineToneClass = (tone) => {
  if (tone === 'muted') return 'text-slate-500 dark:text-slate-400';
  if (tone === 'shift') return 'text-sky-700 dark:text-sky-300';
  if (tone === 'result') return 'font-semibold text-emerald-700 dark:text-emerald-300';
  return 'text-slate-800 dark:text-slate-100';
};

const renderRegisterLines = (lines) => (
  <div className="grid gap-y-2">
    {lines.map((line, index) => {
      if (line.kind === 'blank') {
        return <div key={`blank-${index}`} style={{ minHeight: `${line.height ?? 24}px` }} />;
      }

      if (line.kind === 'bitsWithNote') {
        return (
          <div
            key={`${line.bits}-${line.note}-${index}`}
            className={`min-h-[24px] flex flex-col items-center justify-center gap-1 ${getLineToneClass(line.tone)}`}
          >
            <div>{renderBits(line.bits)}</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              {line.note}
            </div>
          </div>
        );
      }

      if (line.kind === 'operand') {
        return (
          <div
            key={`${line.prefix}-${line.bits}-${index}`}
            className="min-h-[30px] flex items-center justify-center text-slate-500 dark:text-slate-400"
          >
            <div className="flex items-center gap-3">
              <span className="w-10 text-right text-[15px] font-bold">{line.prefix}</span>
              <div className="border-b-2 border-slate-400 pb-1 dark:border-slate-500">
                {renderBits(line.bits)}
              </div>
              {line.note && (
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                  {line.note}
                </span>
              )}
            </div>
          </div>
        );
      }

      if (line.kind === 'label') {
        return (
          <div
            key={`${line.text}-${index}`}
            className={`min-h-[24px] flex items-center justify-center text-xs font-semibold uppercase tracking-[0.22em] ${getLineToneClass(line.tone)}`}
          >
            {line.text}
          </div>
        );
      }

      return (
        <div
          key={`${line.bits}-${index}`}
          className={`min-h-[24px] flex items-center justify-center ${getLineToneClass(line.tone)}`}
        >
          {renderBits(line.bits)}
        </div>
      );
    })}
  </div>
);

const renderRadix4Digits = (digits, totalDigits) => {
  const padded = Array.from(
    { length: totalDigits },
    (_, index) => digits[index - (totalDigits - digits.length)]
  );

  return (
    <div className="flex flex-wrap justify-center gap-1">
      {padded.map((digit, index) => {
        const isKnown = digit != null;
        const label = !isKnown ? '.' : formatRadix4Digit(digit);

        return (
          <span
            key={`radix4-${index}-${label}`}
            className={`inline-flex min-h-[1.8rem] min-w-[2rem] items-center justify-center rounded-md px-1 text-[11px] font-semibold ${
              !isKnown
                ? 'text-slate-300 dark:text-slate-700'
                : digit < 0
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200'
                  : digit > 0
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
};

const chooseRadix4Digit = (bNibble, pTop6Value) => {
  const rows = RADIX4_SELECTION_TABLE[bNibble] ?? RADIX4_SELECTION_TABLE[8];
  const matches = rows.filter((row) => pTop6Value >= row.min && pTop6Value <= row.max);

  if (matches.length === 0) {
    const nearest = [...rows].sort((left, right) => {
      const leftDistance =
        pTop6Value < left.min ? left.min - pTop6Value : pTop6Value - left.max;
      const rightDistance =
        pTop6Value < right.min ? right.min - pTop6Value : pTop6Value - right.max;
      return leftDistance - rightDistance;
    })[0];

    return { q: nearest.q, rows, matchedRow: nearest, ambiguous: false };
  }

  const selected = [...matches].sort(
    (left, right) => Math.abs(left.q) - Math.abs(right.q) || left.q - right.q
  )[0];

  return {
    q: selected.q,
    rows,
    matchedRow: selected,
    ambiguous: matches.length > 1,
  };
};

const generateSrt4Data = (dividend, divisor, bits) => {
  if (divisor <= 0) return null;

  const pBits = bits + 1;
  const iterations = bits / 2;
  const initialP = '0'.repeat(pBits);
  const initialA = toUnsignedBinary(dividend, bits);
  const initialB = toUnsignedBinary(divisor, bits);
  const leadingZeros = countLeadingZeros(initialB);

  let P = initialP;
  let A = initialA;
  let B = initialB;

  if (leadingZeros > 0) {
    const shiftedPair = shiftLeftPair(P, A, leadingZeros);
    P = shiftedPair.left;
    A = shiftedPair.right;
    B = shiftLeftBits(B, leadingZeros);
  }

  const normalizedP = P;
  const normalizedA = A;
  const normalizedB = B;
  const bNibble = parseInt(normalizedB.slice(0, 4), 2);
  const normalizedBWide = `0${normalizedB}`;
  const negNormalizedBWide = intToC2(-parseInt(normalizedB, 2), pBits);
  const pos2BWide = intToC2(2 * parseInt(normalizedB, 2), pBits);
  const neg2BWide = intToC2(-2 * parseInt(normalizedB, 2), pBits);

  const qDigits = [];
  const blocks = [];

  for (let i = 0; i < iterations; i++) {
    const startP = P;
    const startA = A;
    const selectorPBits = getTopSignedBits(startP, 6);
    const selectorPValue = c2ToInt(selectorPBits);
    const selection = chooseRadix4Digit(bNibble, selectorPValue);
    const shiftedPair = shiftLeftPair(startP, startA, 2);
    const shiftedP = shiftedPair.left;
    const shiftedA = shiftedPair.right;

    let operandBits = null;
    let operandName = '';
    let operandPrefix = '';

    if (selection.q === 2) {
      operandBits = neg2BWide;
      operandName = '-2B (C2)';
      operandPrefix = '+';
    } else if (selection.q === 1) {
      operandBits = negNormalizedBWide;
      operandName = '-B (C2)';
      operandPrefix = '+';
    } else if (selection.q === -1) {
      operandBits = normalizedBWide;
      operandName = 'B';
      operandPrefix = '+';
    } else if (selection.q === -2) {
      operandBits = pos2BWide;
      operandName = '2B word';
      operandPrefix = '+';
    }

    const finalP = operandBits ? addBinaryStr(shiftedP, operandBits).result : shiftedP;

    qDigits.push(selection.q);

    blocks.push({
      id: `cycle_${i}`,
      iteration: i,
      count: getCountStr(i, iterations - 1),
      selectorPBits,
      selectorPValue,
      qDigit: selection.q,
      matchedRow: selection.matchedRow,
      ambiguous: selection.ambiguous,
      startP,
      startA,
      shiftedP,
      shiftedA,
      operandBits,
      operandPrefix,
      operandName,
      finalP,
      quotientDigits: [...qDigits],
    });

    P = finalP;
    A = shiftedA;
  }

  const rawQuotient = qDigits.reduce(
    (sum, digit, index) => sum + digit * 4 ** (iterations - 1 - index),
    0
  );
  const finalNegative = P[0] === '1';
  const correctedP = finalNegative ? addBinaryStr(P, normalizedBWide).result : P;
  const correctedQuotient = rawQuotient - (finalNegative ? 1 : 0);
  const normalizedRemainder = parseInt(correctedP, 2);
  const remainder = leadingZeros > 0 ? normalizedRemainder >> leadingZeros : normalizedRemainder;

  return {
    bits,
    pBits,
    iterations,
    leadingZeros,
    initialP,
    initialA,
    initialB,
    normalizedP,
    normalizedA,
    normalizedB,
    bNibble,
    normalizedBWide,
    negNormalizedBWide,
    pos2BWide,
    neg2BWide,
    blocks,
    qDigits,
    rawQuotient,
    finalNegative,
    finalP: P,
    correctedP,
    correctedQuotient,
    normalizedRemainder,
    remainder,
    quotientBinary: toUnsignedBinary(correctedQuotient, bits),
    remainderBinary: toUnsignedBinary(remainder, bits),
    selectionRows: RADIX4_SELECTION_TABLE[bNibble] ?? [],
  };
};

export default function SRT4Division() {
  const [dividend, setDividend] = useState(154);
  const [divisor, setDivisor] = useState(27);
  const [bitWidthMode, setBitWidthMode] = useState('manual');
  const [manualBitSize, setManualBitSize] = useState(8);
  const [currentBlockIdx, setCurrentBlockIdx] = useState(0);

  const autoBitSize = useMemo(() => chooseSrt4Bits(dividend, divisor), [dividend, divisor]);
  const bitSize =
    bitWidthMode === 'manual'
      ? normalizeSrt4Bits(Math.max(autoBitSize, manualBitSize))
      : autoBitSize;

  const srtData = useMemo(
    () => generateSrt4Data(dividend, divisor, bitSize),
    [bitSize, dividend, divisor]
  );

  const maxBlockIdx = Math.max(0, (srtData?.blocks.length ?? 1) - 1);
  const clampedBlockIdx = Math.min(currentBlockIdx, maxBlockIdx);
  const visibleBlocks = srtData ? srtData.blocks.slice(0, clampedBlockIdx + 1) : [];
  const currentBlock =
    visibleBlocks.length > 0
      ? visibleBlocks[visibleBlocks.length - 1]
      : srtData?.blocks[0] ?? null;
  const rawQuotientText = srtData ? formatRadix4WeightedSum(srtData.qDigits) : '0';

  const resetProgress = () => setCurrentBlockIdx(0);

  return (
    <div className="booth-page min-h-screen">
      <div className="workbench-shell srt4-workbench flex flex-col xl:flex-row">
        <div className="workbench-sidebar srt4-sidebar w-full p-4 shadow-lg sm:p-5 xl:min-h-[calc(100vh-7rem)] xl:w-[24rem] 2xl:w-[26rem]">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-2.5 dark:border-slate-700 dark:bg-slate-950/50">
              <Cpu className="h-5 w-5 text-slate-700 dark:text-slate-200" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 dark:text-slate-200">SRT-4 Division</h1>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                top6(P), top4(B) digit selection
              </p>
            </div>
          </div>

          <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                Dividend (A)
              </label>
              <input
                type="number"
                min={0}
                value={dividend}
                onChange={(event) => {
                  setDividend(Math.max(0, parseInt(event.target.value, 10) || 0));
                  resetProgress();
                }}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                Divisor (B)
              </label>
              <input
                type="number"
                min={0}
                value={divisor}
                onChange={(event) => {
                  setDivisor(Math.max(0, parseInt(event.target.value, 10) || 0));
                  resetProgress();
                }}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2 xl:col-span-1">
              <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                Bit Width
              </label>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBitWidthMode('auto');
                    resetProgress();
                  }}
                  className={toggleButtonClass(bitWidthMode === 'auto')}
                >
                  Auto
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBitWidthMode('manual');
                    resetProgress();
                  }}
                  className={toggleButtonClass(bitWidthMode === 'manual')}
                >
                  Manual
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-slate-700 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
                  Auto minimum: {autoBitSize}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-slate-700 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
                  Using now: {bitSize}
                </div>
              </div>
              {bitWidthMode === 'manual' && (
                <input
                  type="number"
                  min={autoBitSize}
                  step={2}
                  value={manualBitSize}
                  onChange={(event) => {
                    const parsed = parseInt(event.target.value, 10);
                    setManualBitSize(
                      normalizeSrt4Bits(Number.isFinite(parsed) ? parsed : autoBitSize)
                    );
                    resetProgress();
                  }}
                  className={`${inputClass} mt-2`}
                />
              )}
            </div>
          </div>

          {srtData ? (
            <>
              <div className="surface-card surface-card--muted mb-5 rounded-[1.35rem] p-4 text-sm text-slate-700 dark:text-slate-300">
                <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  <span>Register setup</span>
                  <span>P: {srtData.pBits} bits</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span>P (start)</span>
                    <span className="font-mono text-xs sm:text-sm">{srtData.initialP}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>A (start)</span>
                    <span className="font-mono text-xs sm:text-sm">{srtData.initialA}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>B (start)</span>
                    <span className="font-mono text-xs sm:text-sm">{srtData.initialB}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 dark:border-slate-700">
                    <div className="flex items-center justify-between gap-3">
                      <span>Leading zeros in B</span>
                      <span className="font-semibold">k = {srtData.leadingZeros}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span>B {'<<'} k (unsigned)</span>
                      <span className="font-mono text-xs sm:text-sm">{srtData.normalizedB}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span>b selector</span>
                      <span className="font-mono text-xs sm:text-sm">{srtData.bNibble} ({srtData.normalizedB.slice(0, 4)})</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span>+B word (P width)</span>
                      <span className="font-mono text-xs sm:text-sm">{srtData.normalizedBWide}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span>-B (C2, P width)</span>
                      <span className="font-mono text-xs sm:text-sm">{srtData.negNormalizedBWide}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span>+2B word (P width)</span>
                      <span className="font-mono text-xs sm:text-sm">{srtData.pos2BWide}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span>-2B (C2, P width)</span>
                      <span className="font-mono text-xs sm:text-sm">{srtData.neg2BWide}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="surface-card surface-card--muted mb-5 rounded-[1.35rem] p-4 text-sm text-slate-700 dark:text-slate-300">
                <div className="mb-3 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  <span>SRT-4 selection</span>
                  <span>b = {srtData.bNibble}</span>
                </div>
                <div className="mb-3 rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-slate-950/50">
                  <span className="font-semibold">top6(P)</span>: <span className="font-mono text-[11px] sm:text-xs">{currentBlock?.selectorPBits ?? '000000'}</span>{' '}
                  = <span className="font-semibold">{currentBlock?.selectorPValue ?? 0}</span>
                </div>
                <div className="space-y-2">
                  {srtData.selectionRows.map((row) => {
                    const isActive =
                      currentBlock &&
                      row.min === currentBlock.matchedRow?.min &&
                      row.max === currentBlock.matchedRow?.max &&
                      row.q === currentBlock.matchedRow?.q;

                    return (
                      <div
                        key={`${row.min}-${row.max}-${row.q}`}
                        className={`rounded-xl border px-3 py-2 text-sm transition ${
                          isActive
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
                            : 'border-slate-200 bg-white/70 dark:border-slate-700 dark:bg-slate-950/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-mono">
                            {row.min} .. {row.max}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            q = {formatRadix4Digit(row.q)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {currentBlock?.ambiguous && (
                  <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                    Overlap hit: this page picks the valid digit with the smallest |q|.
                  </div>
                )}
              </div>

              <div className="surface-card surface-card--muted rounded-[1.35rem] p-4">
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Step controls
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={iconButtonClass}
                    onClick={() => setCurrentBlockIdx(0)}
                    disabled={clampedBlockIdx === 0}
                    aria-label="Reset to first block"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className={iconButtonClass}
                    onClick={() => setCurrentBlockIdx((index) => Math.max(0, index - 1))}
                    disabled={clampedBlockIdx === 0}
                    aria-label="Previous block"
                  >
                    <ChevronRight className="h-4 w-4 rotate-180" />
                  </button>
                  <button
                    type="button"
                    className={iconButtonClass}
                    onClick={() => setCurrentBlockIdx((index) => Math.min(maxBlockIdx, index + 1))}
                    disabled={clampedBlockIdx >= maxBlockIdx}
                    aria-label="Next block"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className={primaryButtonClass}
                    onClick={() => setCurrentBlockIdx(maxBlockIdx)}
                    disabled={clampedBlockIdx >= maxBlockIdx}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Run all
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="surface-card rounded-[1.5rem] p-6 text-center text-slate-500 dark:text-slate-400">
              Enter a non-zero divisor to generate the SRT-4 table.
            </div>
          )}
        </div>

        <div className="workbench-main srt4-main min-w-0 flex-1 p-3 sm:p-4 xl:p-5">
          {srtData ? (
            <>
              <div className="surface-card mb-5 rounded-[1.5rem] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    radix = 4
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    q in {'{ -2, -1, 0, 1, 2 }'}
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    shift P,A by 2
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    normalize by k = {srtData.leadingZeros}
                  </div>
                  {currentBlock && (
                    <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
                      b = {srtData.bNibble}, top6(P) = {currentBlock.selectorPValue}, q ={' '}
                      {formatRadix4Digit(currentBlock.qDigit)}
                    </div>
                  )}
                </div>
              </div>

              <div className="table-shell srt4-table-shell overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
                <div className="overflow-x-auto overscroll-x-contain">
                  <table className="w-full min-w-[58rem] border-collapse lg:min-w-[64rem]">
                    <thead>
                      <tr className="bg-slate-50/90 dark:bg-slate-900/80">
                        <th className="border-r border-slate-200 px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:border-slate-700 dark:text-slate-400">
                          P
                        </th>
                        <th className="border-r border-slate-200 px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:border-slate-700 dark:text-slate-400">
                          A
                        </th>
                        <th className="border-r border-slate-200 px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:border-slate-700 dark:text-slate-400">
                          B
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                          Count
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleBlocks.map((block, index) => {
                        const isActive = index === visibleBlocks.length - 1;
                        const pLines = [];
                        const bLines = [];
                        const isFirstBlock = block.iteration === 0;

                        if (isFirstBlock) {
                          pLines.push({ kind: 'bits', bits: srtData.initialP, tone: 'base' });
                          if (srtData.leadingZeros > 0) {
                            pLines.push({
                              kind: 'bitsWithNote',
                              bits: srtData.normalizedP,
                              tone: 'muted',
                              note: 'normalize',
                            });
                          } else {
                            pLines.push({ kind: 'blank' });
                          }

                          bLines.push({
                            kind: 'bitsWithNote',
                            bits: srtData.initialB,
                            tone: 'base',
                            note: 'B start',
                          });
                          bLines.push({
                            kind: 'bitsWithNote',
                            bits: srtData.normalizedB,
                            tone: 'muted',
                            note: 'B << k',
                          });
                          bLines.push({
                            kind: 'label',
                            text: `b = ${srtData.bNibble} / k = ${srtData.leadingZeros}`,
                            tone: 'muted',
                          });
                        } else {
                          pLines.push({ kind: 'bits', bits: block.startP, tone: 'base' });
                          pLines.push({ kind: 'blank' });
                          bLines.push({ kind: 'blank' });
                          bLines.push({ kind: 'blank' });
                          bLines.push({ kind: 'blank' });
                        }

                        pLines.push({ kind: 'bits', bits: block.shiftedP, tone: 'shift' });

                        if (block.operandBits) {
                          pLines.push({
                            kind: 'operand',
                            bits: block.operandBits,
                            prefix: block.operandPrefix,
                            note: block.operandName,
                          });
                        } else {
                          pLines.push({ kind: 'blank', height: 30 });
                        }

                        pLines.push({ kind: 'bits', bits: block.finalP, tone: 'result' });

                        return (
                          <tr
                            key={block.id}
                            className={`border-b align-top ${
                              isActive
                                ? 'table-band-amber'
                                : 'table-band-slate border-slate-100 dark:border-slate-800'
                            }`}
                          >
                            <td className="border-r border-slate-200 px-4 py-4 dark:border-slate-700">
                              {renderRegisterLines(pLines)}
                            </td>

                            <td className="border-r border-slate-200 px-4 py-4 dark:border-slate-700">
                              <div className="grid gap-y-2">
                                {isFirstBlock ? (
                                  <>
                                    <div className="min-h-[24px] flex items-center justify-center text-slate-800 dark:text-slate-100">
                                      {renderBits(srtData.initialA)}
                                    </div>
                                    {srtData.leadingZeros > 0 ? (
                                      <div className="min-h-[24px] flex items-center justify-center text-slate-500 dark:text-slate-400">
                                        {renderBits(srtData.normalizedA)}
                                      </div>
                                    ) : (
                                      <div className="min-h-[24px]" />
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <div className="min-h-[24px] flex items-center justify-center text-slate-800 dark:text-slate-100">
                                      {renderBits(block.startA)}
                                    </div>
                                    <div className="min-h-[24px]" />
                                  </>
                                )}
                                <div className="min-h-[24px] flex items-center justify-center text-sky-700 dark:text-sky-300">
                                  {renderBits(block.shiftedA)}
                                </div>
                                <div className="min-h-[30px]" />
                                <div className="min-h-[24px] flex flex-col items-center justify-center gap-1">
                                  {renderRadix4Digits(block.quotientDigits, srtData.iterations)}
                                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                                    q digits so far
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="border-r border-slate-200 px-4 py-4 dark:border-slate-700">
                              {renderRegisterLines([
                                ...bLines,
                                { kind: 'blank' },
                                { kind: 'blank', height: 30 },
                              ])}
                            </td>

                            <td className="px-4 py-4 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                              <div className="flex min-h-[160px] flex-col items-center justify-center gap-3">
                                <span>{block.count}</span>
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                    block.qDigit < 0
                                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200'
                                      : block.qDigit > 0
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200'
                                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                                  }`}
                                >
                                  q = {formatRadix4Digit(block.qDigit)}
                                </span>
                                <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                                  top6(P) = {block.selectorPValue}
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {clampedBlockIdx === maxBlockIdx && (
                        <tr className="border-t-2 border-fuchsia-400/80 bg-fuchsia-50/40 align-top dark:border-fuchsia-400/40 dark:bg-fuchsia-500/5">
                          <td className="border-r border-slate-200 px-4 py-4 dark:border-slate-700">
                            {renderRegisterLines([
                              { kind: 'bits', bits: srtData.finalP, tone: 'base' },
                              ...(srtData.finalNegative
                                ? [
                                    {
                                      kind: 'operand',
                                      bits: srtData.normalizedBWide,
                                      prefix: '+',
                                      note: 'B',
                                    },
                                  ]
                                : []),
                              { kind: 'bits', bits: srtData.correctedP, tone: 'result' },
                              {
                                kind: 'label',
                                text:
                                  srtData.leadingZeros > 0
                                    ? `R = ${srtData.remainderBinary} (${srtData.remainder})`
                                    : `R = ${srtData.remainderBinary}`,
                                tone: 'result',
                              },
                            ])}
                          </td>
                          <td className="border-r border-slate-200 px-4 py-4 dark:border-slate-700">
                            <div className="space-y-3 text-center text-sm text-slate-700 dark:text-slate-300">
                              <div>{renderRadix4Digits(srtData.qDigits, srtData.iterations)}</div>
                              <div className="font-mono">{rawQuotientText}</div>
                              {srtData.finalNegative && (
                                <div className="font-mono text-rose-700 dark:text-rose-300">
                                  {srtData.rawQuotient} - 1
                                </div>
                              )}
                              <div className="font-mono text-slate-500 dark:text-slate-400">
                                Q = {srtData.quotientBinary}
                              </div>
                              <div className="font-semibold text-fuchsia-700 dark:text-fuchsia-300">
                                q = {srtData.correctedQuotient}
                              </div>
                            </div>
                          </td>
                          <td className="border-r border-slate-200 px-4 py-4 dark:border-slate-700">
                            <div className="grid gap-y-2">
                              {srtData.finalNegative ? (
                                <>
                                  <div className="min-h-[24px] flex items-center justify-center text-slate-500 dark:text-slate-400">
                                    {renderBits(srtData.normalizedBWide)}
                                  </div>
                                  <div className="min-h-[30px] flex items-center justify-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                                    + B
                                  </div>
                                </>
                              ) : (
                                <div className="min-h-[54px] flex items-center justify-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                                  Done
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center text-sm font-semibold text-fuchsia-700 dark:text-fuchsia-300">
                            CORRECTION
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
                  <div className="surface-card rounded-[1.35rem] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        Final correction
                      </div>
                      <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {srtData.finalNegative ? 'Needed' : 'Not needed'}
                      </div>
                    </div>
                    <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                      <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950/50">
                        Full q digits: <span className="font-mono">{formatRadix4Sequence(srtData.qDigits)}</span>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950/50">
                        Signed-digit quotient before correction:{' '}
                        <span className="font-mono">{rawQuotientText}</span> ={' '}
                        <span className="font-semibold">{srtData.rawQuotient}</span>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950/50">
                        Final P before correction: <span className="font-mono">{srtData.finalP}</span>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950/50">
                        {srtData.finalNegative ? (
                          <>
                            Since <span className="font-mono">P &lt; 0</span>, correct the remainder with{' '}
                            <span className="font-mono">P + B</span> and the quotient with{' '}
                            <span className="font-mono">q - 1</span>.
                          </>
                        ) : (
                          <>
                            Since <span className="font-mono">P &gt;= 0</span>, the raw signed-digit quotient is already final.
                          </>
                        )}
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950/50">
                        Corrected P: <span className="font-mono">{srtData.correctedP}</span>
                        {srtData.finalNegative ? ' = P + B' : ' (unchanged)'}
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950/50">
                        Corrected quotient: <span className="font-mono">{srtData.correctedQuotient}</span>
                        {srtData.finalNegative ? ` = ${srtData.rawQuotient} - 1` : ` = ${srtData.rawQuotient}`}
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950/50">
                        Undo normalization last: <span className="font-mono">{srtData.normalizedRemainder}</span>
                        {srtData.leadingZeros > 0 ? (
                          <>
                            {' '}
                            {'>>'} {srtData.leadingZeros} = <span className="font-semibold">{srtData.remainder}</span>
                          </>
                        ) : (
                          <> = <span className="font-semibold">{srtData.remainder}</span></>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="surface-card rounded-[1.35rem] p-4">
                    <div className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      Correct results
                    </div>
                    <div className="space-y-4">
                      <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50/80 px-4 py-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                          <span>Quotient</span>
                          <HoverInfo title="How To Check Quotient" align="right">
                            <div className="space-y-2">
                              <div>
                                Read the quotient from the radix-4 signed digits{' '}
                                <span className="font-semibold">q_i in {'{ -2, -1, 0, 1, 2 }'}</span>.
                              </div>
                              <div className="font-mono rounded bg-slate-100 px-2 py-1 dark:bg-slate-950/70">
                                q digits = {formatRadix4Sequence(srtData.qDigits)}
                              </div>
                              <div>
                                Weighted value: <span className="font-mono">{rawQuotientText}</span> ={' '}
                                <span className="font-semibold">{srtData.rawQuotient}</span>
                              </div>
                              <div>
                                {srtData.finalNegative
                                  ? `Final P was negative, so the algorithm says q = q - 1: ${srtData.rawQuotient} - 1 = ${srtData.correctedQuotient}.`
                                  : 'Final P was nonnegative, so the weighted radix-4 value is already the final quotient.'}
                              </div>
                              <div>
                                Final unsigned quotient bits ={' '}
                                <span className="font-mono">{srtData.quotientBinary}</span>.
                              </div>
                            </div>
                          </HoverInfo>
                        </div>
                        <div className="font-mono text-2xl font-bold tracking-[0.2em] text-emerald-900 dark:text-emerald-100">
                          {srtData.quotientBinary}
                        </div>
                        <div className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
                          decimal = {srtData.correctedQuotient}
                        </div>
                      </div>

                      <div className="rounded-[1.25rem] border border-sky-200 bg-sky-50/80 px-4 py-4 dark:border-sky-500/30 dark:bg-sky-500/10">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-sky-800 dark:text-sky-200">
                          <span>Remainder</span>
                          <HoverInfo title="How To Check Remainder" align="right">
                            <div className="space-y-2">
                              <div>
                                First correct the final partial remainder only if{' '}
                                <span className="font-mono">P</span> is negative, then undo the normalization shift.
                              </div>
                              <div className="font-mono rounded bg-slate-100 px-2 py-1 dark:bg-slate-950/70">
                                final P = {srtData.finalP}
                              </div>
                              <div>
                                {srtData.finalNegative
                                  ? `Because P < 0, add B once: corrected P = ${srtData.correctedP}.`
                                  : `Because P >= 0, corrected P stays ${srtData.correctedP}.`}
                              </div>
                              <div>
                                The corrected normalized remainder is{' '}
                                <span className="font-semibold">{srtData.normalizedRemainder}</span>.
                              </div>
                              <div>
                                {srtData.leadingZeros > 0
                                  ? `Shift right by k = ${srtData.leadingZeros}: ${srtData.normalizedRemainder} >> ${srtData.leadingZeros} = ${srtData.remainder}.`
                                  : 'k = 0, so the normalized remainder is already the true remainder.'}
                              </div>
                              <div>
                                Final unsigned remainder bits ={' '}
                                <span className="font-mono">{srtData.remainderBinary}</span>.
                              </div>
                            </div>
                          </HoverInfo>
                        </div>
                        <div className="font-mono text-2xl font-bold tracking-[0.2em] text-sky-900 dark:text-sky-100">
                          {srtData.remainderBinary}
                        </div>
                        <div className="mt-1 text-sm text-sky-800 dark:text-sky-200">
                          decimal = {srtData.remainder}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="surface-card rounded-[1.5rem] p-6 text-center text-slate-500 dark:text-slate-400">
              Enter a non-zero divisor to generate the SRT-4 table.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
