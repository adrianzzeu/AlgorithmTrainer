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

const normalizeSrtBits = (bits) => Math.max(2, bits);

const chooseSrtBits = (dividend, divisor) =>
  Math.max(
    2,
    requiredBitsForUnsignedInt(dividend),
    requiredBitsForUnsignedInt(divisor)
  );

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

const formatQi = (digit) => (digit === -1 ? '-1' : String(digit));

const formatSignedPowerTerms = (digits) => {
  const terms = digits
    .map((digit, index) => {
      if (digit === 0) return null;
      const power = digits.length - 1 - index;
      const coeff = digit === -1 ? '-' : '';
      return `${coeff}2^${power}`;
    })
    .filter(Boolean);

  if (terms.length === 0) return '0';

  return terms.join(' + ').replace(/\+ -/g, '- ');
};

const trimLeadingZeroQiDigits = (digits) => {
  const firstNonZeroIndex = digits.findIndex((digit) => digit !== 0);
  return firstNonZeroIndex === -1 ? [0] : digits.slice(firstNonZeroIndex);
};

const formatQiSequence = (digits) => digits.map(formatQi).join(' ');

const renderBits = (bitStr, highlightTail = 0) =>
  bitStr.split('').map((bit, index) => {
    const isHighlighted = highlightTail > 0 && index >= bitStr.length - highlightTail;

    return (
      <span
        key={`${bitStr}-${index}`}
        className={`inline-block w-4 text-center ${
          isHighlighted ? 'font-semibold text-fuchsia-600 dark:text-fuchsia-300' : ''
        }`}
      >
        {bit}
      </span>
    );
  });

const renderQiDigits = (digits, totalBits) => {
  const padded = Array.from(
    { length: totalBits },
    (_, index) => digits[index - (totalBits - digits.length)]
  );

  return padded.map((digit, index) => {
    const isKnown = digit != null;
    const label = !isKnown ? '.' : formatQi(digit);
    const isNegativeDigit = digit === -1;

    return (
      <span
        key={`qi-${index}-${label}`}
        className={`inline-flex min-h-[1.6rem] min-w-[1.6rem] items-center justify-center rounded-md px-1 text-[11px] font-semibold ${
          !isKnown
            ? 'text-slate-300 dark:text-slate-700'
            : isNegativeDigit
              ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200'
              : digit === 1
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
        }`}
      >
        {label}
      </span>
    );
  });
};

const getLineToneClass = (tone) => {
  if (tone === 'muted') return 'text-slate-500 dark:text-slate-400';
  if (tone === 'shift') return 'text-sky-700 dark:text-sky-300';
  if (tone === 'result') return 'font-semibold text-emerald-700 dark:text-emerald-300';
  return 'text-slate-800 dark:text-slate-100';
};

const renderRegisterLines = (lines) => (
  <div className="grid gap-y-2">
    {lines.map((line, index) => {
      if (line.kind === 'operand') {
        return (
          <div
            key={`${line.prefix}-${line.bits}-${index}`}
            className="min-h-[30px] flex items-center justify-center text-slate-500 dark:text-slate-400"
          >
            <div className="flex items-center gap-3">
              <span className="w-8 text-right text-[15px] font-bold">{line.prefix}</span>
              <div className="border-b-2 border-slate-400 pb-1 dark:border-slate-500">
                {renderBits(line.bits)}
              </div>
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
          {renderBits(line.bits, line.highlightTail ?? 0)}
        </div>
      );
    })}
  </div>
);

const buildADisplayTokens = (bitStr, quotientDigits) => {
  const baseTokens = bitStr.split('').map((bit) => ({ label: bit, tone: 'base' }));
  const digitCount = quotientDigits.length;

  if (digitCount <= 0) return baseTokens;

  const startIndex = Math.max(0, bitStr.length - digitCount);

  quotientDigits.forEach((digit, index) => {
    const tokenIndex = startIndex + index;
    if (tokenIndex < 0 || tokenIndex >= baseTokens.length) return;

    baseTokens[tokenIndex] = {
      label: formatQi(digit),
      tone: digit === -1 ? 'negative' : 'quotient',
    };
  });

  return baseTokens;
};

const getAToneClass = (tone) => {
  if (tone === 'muted') return 'text-slate-500 dark:text-slate-400';
  if (tone === 'shift') return 'text-sky-700 dark:text-sky-300';
  if (tone === 'result') return 'text-emerald-700 dark:text-emerald-300';
  return 'text-slate-800 dark:text-slate-100';
};

const renderATokens = (tokens, defaultTone = 'base') => (
  <div className="flex flex-wrap justify-center gap-x-1 gap-y-1">
    {tokens.map((token, index) => (
      <span
        key={`${token.label}-${index}`}
        className={`inline-flex min-h-[1.6rem] min-w-[1.6rem] items-center justify-center rounded-md px-1 text-[11px] font-semibold ${
          token.tone === 'negative'
            ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200'
            : token.tone === 'quotient'
              ? 'text-fuchsia-600 dark:text-fuchsia-300'
              : getAToneClass(defaultTone)
        }`}
      >
        {token.label}
      </span>
    ))}
  </div>
);

const generateSrtData = (dividend, divisor, bits) => {
  if (divisor <= 0) return null;

  const pBits = bits + 1;
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
  const normalizedBWide = `0${B}`;
  const negNormalizedBWide = intToC2(-parseInt(B, 2), pBits);

  const qDigits = [];
  const blocks = [];

  for (let i = 0; i < bits; i++) {
    const startP = P;
    const startA = A;
    const top3 = startP.slice(0, 3);
    const allEqual = top3[0] === top3[1] && top3[1] === top3[2];
    const shiftedPair = shiftLeftPair(startP, startA, 1);
    const shiftedP = shiftedPair.left;
    const shiftedA = shiftedPair.right;

    let qDigit = 0;
    let opLabel = 'Shift only';
    let operandBits = null;
    let finalP = shiftedP;
    let caseLabel = 'Case (a)';
    let caseRule = 'Top three bits are 000 or 111, so q_i = 0.';

    if (!allEqual) {
      if (startP[0] === '1') {
        qDigit = -1;
        opLabel = '+B';
        operandBits = normalizedBWide;
        finalP = addBinaryStr(shiftedP, operandBits).result;
        caseLabel = 'Case (b)';
        caseRule = 'Top three bits are 100, 101, or 110, so q_i = -1 and we add B after the shift.';
      } else {
        qDigit = 1;
        opLabel = '-B';
        operandBits = negNormalizedBWide;
        finalP = addBinaryStr(shiftedP, operandBits).result;
        caseLabel = 'Case (c)';
        caseRule = 'Top three bits are 001, 010, or 011, so q_i = 1 and we subtract B after the shift.';
      }
    }

    qDigits.push(qDigit);

    blocks.push({
      id: `cycle_${i}`,
      iteration: i,
      count: getCountStr(i, bits - 1),
      top3,
      caseLabel,
      caseRule,
      qDigit,
      startP,
      startA,
      shiftedP,
      shiftedA,
      opLabel,
      operandBits,
      finalP,
      finalA: shiftedA,
      quotientDigits: [...qDigits],
      pStartValue: c2ToInt(startP),
      pFinalValue: c2ToInt(finalP),
    });

    P = finalP;
    A = shiftedA;
  }

  const redundantQuotient = qDigits.reduce(
    (sum, digit, index) => sum + digit * 2 ** (bits - 1 - index),
    0
  );
  const finalNegative = P[0] === '1';
  const correctedP = finalNegative ? addBinaryStr(P, normalizedBWide).result : P;
  const correctedQuotient = redundantQuotient - (finalNegative ? 1 : 0);
  const normalizedRemainder = parseInt(correctedP, 2);
  const remainder = leadingZeros > 0 ? normalizedRemainder >> leadingZeros : normalizedRemainder;

  return {
    bits,
    pBits,
    leadingZeros,
    initialP,
    initialA,
    initialB,
    normalizedP,
    normalizedA,
    normalizedB,
    normalizedBWide,
    blocks,
    qDigits,
    redundantQuotient,
    finalNegative,
    finalP: P,
    correctedP,
    correctedQuotient,
    normalizedRemainder,
    remainder,
    quotientBinary: toUnsignedBinary(correctedQuotient, bits),
    remainderBinary: toUnsignedBinary(remainder, bits),
  };
};

export default function SRTDivision() {
  const [dividend, setDividend] = useState(8);
  const [divisor, setDivisor] = useState(3);
  const [bitWidthMode, setBitWidthMode] = useState('manual');
  const [manualBitSize, setManualBitSize] = useState(8);
  const [currentBlockIdx, setCurrentBlockIdx] = useState(0);

  const autoBitSize = useMemo(() => chooseSrtBits(dividend, divisor), [dividend, divisor]);
  const bitSize =
    bitWidthMode === 'manual'
      ? normalizeSrtBits(Math.max(autoBitSize, manualBitSize))
      : autoBitSize;

  const srtData = useMemo(
    () => generateSrtData(dividend, divisor, bitSize),
    [bitSize, dividend, divisor]
  );

  const maxBlockIdx = Math.max(0, (srtData?.blocks.length ?? 1) - 1);
  const clampedBlockIdx = Math.min(currentBlockIdx, maxBlockIdx);
  const visibleBlocks = srtData ? srtData.blocks.slice(0, clampedBlockIdx + 1) : [];
  const quotientTermText = srtData ? formatSignedPowerTerms(srtData.qDigits) : '0';
  const compactQDigits = srtData ? trimLeadingZeroQiDigits(srtData.qDigits) : [0];
  const compactQDigitText = formatQiSequence(compactQDigits);
  const quotientCorrectionText = srtData
    ? srtData.finalNegative
      ? `${quotientTermText} - 1 = ${srtData.correctedQuotient}`
      : `${quotientTermText} = ${srtData.correctedQuotient}`
    : '0';

  const resetProgress = () => setCurrentBlockIdx(0);

  return (
    <div className="booth-page min-h-screen">
      <div className="workbench-shell flex flex-col xl:flex-row">
        <div className="workbench-sidebar w-full p-5 shadow-lg xl:min-h-[calc(100vh-7rem)] xl:w-96">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-2.5 dark:border-slate-700 dark:bg-slate-950/50">
              <Cpu className="h-5 w-5 text-slate-700 dark:text-slate-200" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 dark:text-slate-200">SRT-2 Division</h1>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Unsigned A / B with signed P
              </p>
            </div>
          </div>

          <div className="mb-5 space-y-3">
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
            <div>
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
                  value={manualBitSize}
                  onChange={(event) => {
                    const parsed = parseInt(event.target.value, 10);
                    setManualBitSize(normalizeSrtBits(Number.isFinite(parsed) ? parsed : autoBitSize));
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
                  <span>A / B: {bitSize} bits</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span>P (start)</span>
                    <span className="font-mono">{srtData.initialP}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>A (start)</span>
                    <span className="font-mono">{srtData.initialA}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>B (start)</span>
                    <span className="font-mono">{srtData.initialB}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 dark:border-slate-700">
                    <div className="flex items-center justify-between gap-3">
                      <span>Leading zeros in B</span>
                      <span className="font-semibold">{srtData.leadingZeros}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span>B after normalization</span>
                      <span className="font-mono">{srtData.normalizedB}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="truth-table-surface mb-5 rounded-[1.25rem] p-3">
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  SRT-2 rule
                </div>
                <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <div className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 dark:border-slate-700 dark:bg-slate-950/50">
                    <span className="font-mono">000 / 111</span> =&gt; <span className="font-semibold">q_i = 0</span>, shift only
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 dark:border-slate-700 dark:bg-slate-950/50">
                    <span className="font-mono">100 / 101 / 110</span> =&gt; <span className="font-semibold">q_i = -1</span>, shift then add B
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 dark:border-slate-700 dark:bg-slate-950/50">
                    <span className="font-mono">001 / 010 / 011</span> =&gt; <span className="font-semibold">q_i = 1</span>, shift then subtract B
                  </div>
                </div>
              </div>

              <div className="mt-auto space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  <button onClick={resetProgress} className={iconButtonClass} title="Reset">
                    <RotateCcw className="mx-auto h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCurrentBlockIdx((prev) => Math.max(0, prev - 1))}
                    disabled={clampedBlockIdx === 0}
                    className={iconButtonClass}
                    title="Previous"
                  >
                    <ChevronRight className="mx-auto h-4 w-4 rotate-180" />
                  </button>
                  <button
                    onClick={() => setCurrentBlockIdx((prev) => Math.min(maxBlockIdx, prev + 1))}
                    disabled={clampedBlockIdx === maxBlockIdx}
                    className={primaryButtonClass}
                    title="Next"
                  >
                    <ChevronRight className="mx-auto h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCurrentBlockIdx(maxBlockIdx)}
                    disabled={clampedBlockIdx === maxBlockIdx}
                    className={primaryButtonClass}
                    title="Run all"
                  >
                    <Play className="mx-auto h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-[1.35rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              Divisor B must be greater than 0.
            </div>
          )}
        </div>

        <div className="workbench-main flex-1 overflow-x-auto p-4 md:p-6 xl:p-8">
          <div className="mx-auto max-w-6xl">
            {srtData ? (
              <>
                <div className="summary-banner mb-4 flex flex-wrap items-center justify-between gap-4 rounded-[1.4rem] p-4 text-sm text-slate-700 dark:text-slate-200">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-white/70 px-3 py-1 font-semibold dark:bg-slate-900/70">
                      Unsigned A / B
                    </span>
                    <span className="rounded-full bg-white/70 px-3 py-1 font-semibold dark:bg-slate-900/70">
                      P uses {srtData.pBits} bits
                    </span>
                    <span className="rounded-full bg-white/70 px-3 py-1 font-semibold dark:bg-slate-900/70">
                      Normalize by {srtData.leadingZeros}
                    </span>
                    <span className="rounded-full bg-white/70 px-3 py-1 font-semibold dark:bg-slate-900/70">
                      q_i in {'{ -1, 0, 1 }'}
                    </span>
                  </div>
                  <div className="rounded-full bg-white/70 px-3 py-1 font-mono text-xs dark:bg-slate-900/70">
                    Flow: shift -&gt; +/-B inside same count -&gt; if P &lt; 0, correct P then q then undo k
                  </div>
                </div>

                <div className="step-table-surface mt-4 overflow-hidden rounded-[1.5rem]">
                  <table className="w-full border-collapse font-mono text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/90 text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                        <th className="border-r border-slate-200 px-4 py-3 text-center font-semibold dark:border-slate-700">
                          P
                        </th>
                        <th className="border-r border-slate-200 px-4 py-3 text-center font-semibold dark:border-slate-700">
                          A
                        </th>
                        <th className="border-r border-slate-200 px-4 py-3 text-center font-semibold dark:border-slate-700">
                          B
                        </th>
                        <th className="px-4 py-3 text-center font-semibold">COUNT</th>
                      </tr>
                    </thead>
                    <tbody className="text-base text-slate-800 dark:text-slate-100">
                      {visibleBlocks.map((block, index) => {
                        const isActive = index === clampedBlockIdx;
                        const pLines = [];
                        const bLines = [];
                        const priorQDigits = block.quotientDigits.slice(0, -1);
                        const startATokens = buildADisplayTokens(block.startA, priorQDigits);
                        const shiftedATokens = buildADisplayTokens(block.shiftedA, block.quotientDigits);
                        const aHasOp = Boolean(block.operandBits);

                        if (block.iteration === 0) {
                          pLines.push({ kind: 'bits', bits: srtData.initialP, tone: 'base' });
                          bLines.push({ kind: 'bits', bits: srtData.initialB, tone: 'base' });

                          if (srtData.leadingZeros > 0) {
                            pLines.push({ kind: 'bits', bits: srtData.normalizedP, tone: 'muted' });
                            bLines.push({ kind: 'bits', bits: srtData.normalizedB, tone: 'muted' });
                          }
                        } else {
                          pLines.push({ kind: 'bits', bits: block.startP, tone: 'base' });
                        }

                        pLines.push({ kind: 'bits', bits: block.shiftedP, tone: 'shift' });

                        if (block.operandBits) {
                          pLines.push({
                            kind: 'operand',
                            bits: block.operandBits,
                            prefix: block.opLabel === '+B' ? '+' : '-',
                          });
                          pLines.push({ kind: 'bits', bits: block.finalP, tone: 'result' });
                        }

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
                                {block.iteration === 0 ? (
                                  <>
                                    <div className="min-h-[24px] flex items-center justify-center">
                                      {renderATokens(
                                        buildADisplayTokens(srtData.initialA, []),
                                        'base'
                                      )}
                                    </div>
                                    {srtData.leadingZeros > 0 && (
                                      <div className="min-h-[24px] flex items-center justify-center">
                                        {renderATokens(
                                          buildADisplayTokens(srtData.normalizedA, []),
                                          'muted'
                                        )}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="min-h-[24px] flex items-center justify-center">
                                    {renderATokens(startATokens, 'base')}
                                  </div>
                                )}
                                <div className="min-h-[24px] flex items-center justify-center">
                                  {renderATokens(shiftedATokens, 'shift')}
                                </div>
                                {aHasOp && <div className="min-h-[30px]" />}
                                {aHasOp && <div className="min-h-[24px]" />}
                              </div>
                            </td>

                            <td className="border-r border-slate-200 px-4 py-4 dark:border-slate-700">
                              {block.iteration === 0 ? (
                                <div className="grid gap-y-2">
                                  {renderRegisterLines(bLines)}
                                  <div className="min-h-[24px] flex items-center justify-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                                    k = {srtData.leadingZeros}
                                  </div>
                                  {aHasOp && <div className="min-h-[30px]" />}
                                  {aHasOp && <div className="min-h-[24px]" />}
                                </div>
                              ) : (
                                <div className="grid gap-y-2">
                                  <div className="min-h-[24px]" />
                                  <div className="min-h-[24px]" />
                                  {aHasOp && <div className="min-h-[30px]" />}
                                  {aHasOp && <div className="min-h-[24px]" />}
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-4 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                              <div className="flex min-h-[120px] items-center justify-center">
                                <span>{block.count}</span>
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
                                ? [{ kind: 'operand', bits: srtData.normalizedBWide, prefix: '+' }]
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
                            <div className="space-y-2 text-center text-sm text-slate-700 dark:text-slate-300">
                              <div>{renderATokens(buildADisplayTokens('0'.repeat(bitSize), srtData.qDigits), 'base')}</div>
                              {srtData.finalNegative && <div className="font-mono">{quotientTermText} - 1</div>}
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
                                    {renderBits(srtData.normalizedB)}
                                  </div>
                                  <div className="min-h-[30px] flex items-center justify-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                                    + B
                                  </div>
                                  <div className="min-h-[24px]" />
                                </>
                              ) : (
                                <div className="min-h-[72px] flex items-center justify-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
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

                <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
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
                        Full q digits: <span className="font-mono">{formatQiSequence(srtData.qDigits)}</span>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950/50">
                        Significant q digits: <span className="font-mono">{compactQDigitText}</span>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950/50">
                        Signed-digit quotient before correction:{' '}
                        <span className="font-mono">{quotientTermText}</span> ={' '}
                        <span className="font-semibold">{srtData.redundantQuotient}</span>
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
                            Since <span className="font-mono">P &gt;= 0</span>, no correction is needed.
                          </>
                        )}
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950/50">
                        Corrected P: <span className="font-mono">{srtData.correctedP}</span>
                        {srtData.finalNegative ? ' = P + B' : ' (unchanged)'}
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950/50">
                        Corrected quotient: <span className="font-mono">{quotientCorrectionText}</span>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950/50">
                        Only the pre-correction remainder can be negative. The reported remainder is after this fix.
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950/50">
                        Undo normalization last: <span className="font-mono">{srtData.normalizedRemainder}</span>
                        {srtData.leadingZeros > 0 ? (
                          <> {'>>'} {srtData.leadingZeros} = <span className="font-semibold">{srtData.remainder}</span></>
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
                                Read the quotient from the signed digits <span className="font-semibold">q_i in {'{ -1, 0, 1 }'}</span>,
                                then apply the final <span className="font-mono">-1</span> correction only if the last{' '}
                                <span className="font-mono">P</span> is negative.
                              </div>
                              <div className="font-mono rounded bg-slate-100 px-2 py-1 dark:bg-slate-950/70">
                                q digits = {formatQiSequence(srtData.qDigits)}
                              </div>
                              <div className="font-mono rounded bg-slate-100 px-2 py-1 dark:bg-slate-950/70">
                                significant tail = {compactQDigitText}
                              </div>
                              <div>
                                Signed-digit value: <span className="font-mono">{quotientTermText}</span> ={' '}
                                <span className="font-semibold">{srtData.redundantQuotient}</span>
                              </div>
                              <div>
                                {srtData.finalNegative
                                  ? `Final P was negative, so the algorithm says q = q - 1: ${srtData.redundantQuotient} - 1 = ${srtData.correctedQuotient}.`
                                  : 'Final P was nonnegative, so the signed-digit value is already the final quotient.'}
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
                                First correct the remainder only if the final <span className="font-mono">P</span> is
                                negative. Only after that do we undo the normalization shift.
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
              </>
            ) : (
              <div className="surface-card rounded-[1.5rem] p-6 text-center text-slate-500 dark:text-slate-400">
                Enter a non-zero divisor to generate the SRT table.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

