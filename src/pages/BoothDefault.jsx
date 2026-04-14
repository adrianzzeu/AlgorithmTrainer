import React, { useMemo, useState } from 'react';
import {
  CheckCircle,
  ChevronRight,
  GraduationCap,
  Play,
  RotateCcw,
  StepForward,
  XCircle,
} from 'lucide-react';
import { addBinaryStr, intToC2 } from '../utils/binaryHelpers';

const PAIR_RULES = [
  ['00', 'Shift only'],
  ['01', 'A = A + M'],
  ['10', 'A = A - M'],
  ['11', 'Shift only'],
];

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm outline-none transition ' +
  'focus:border-slate-400 focus:ring-0 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-100';

const iconButtonClass =
  'rounded-xl border border-slate-200 bg-white/80 p-2 text-slate-700 transition hover:bg-slate-100 ' +
  'disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-200 dark:hover:bg-slate-900';

const primaryButtonClass =
  'rounded-xl border border-slate-900 bg-slate-900 px-5 py-2 font-semibold text-white transition hover:bg-slate-800 ' +
  'disabled:opacity-40 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white';

const createEmptyPracticeInputs = () => ({ A: '', Q: '', Q1: '' });

const clampToSignedWidth = (num, bits) => {
  const min = -(2 ** (bits - 1));
  const max = 2 ** (bits - 1) - 1;
  return Math.min(max, Math.max(min, num));
};

const addBinary = (left, right) => addBinaryStr(left, right).result;

const toTwosComplementStr = (num, bits) => intToC2(clampToSignedWidth(num, bits), bits);

const getCountStr = (count, bitSize) => {
  const countBits = Math.max(2, Math.ceil(Math.log2(Math.max(2, bitSize))));
  return Math.max(0, count).toString(2).padStart(countBits, '0');
};

const renderBits = (bitStr) =>
  bitStr.split('').map((bit, index) => (
    <span key={`${bitStr}-${index}`} className="inline-block w-4 text-center">
      {bit}
    </span>
  ));

const renderQWithBracket = (Q, Q1, highlightPair) => {
  const msbs = Q.slice(0, -1);
  const lsb = Q[Q.length - 1];

  return (
    <div className="flex items-center">
      {msbs.split('').map((bit, index) => (
        <span key={`${Q}-msb-${index}`} className="inline-block w-4 text-center">
          {bit}
        </span>
      ))}
      <div className={`flex items-center ${highlightPair ? 'border-b-2 border-slate-500 dark:border-slate-300' : ''}`}>
        <span className="inline-block w-4 text-center">{lsb}</span>
        <span className="inline-block w-2 text-center text-transparent">_</span>
        <span className="inline-block w-4 text-center font-semibold text-slate-500 dark:text-slate-300">{Q1}</span>
      </div>
    </div>
  );
};

const generateBoothSteps = (multiplier, multiplicand, bits) => {
  const qValue = clampToSignedWidth(multiplier, bits);
  const mValue = clampToSignedWidth(multiplicand, bits);

  let A = '0'.repeat(bits);
  let Q = toTwosComplementStr(qValue, bits);
  let Q1 = '0';

  const M = toTwosComplementStr(mValue, bits);
  const MNeg = toTwosComplementStr(-mValue, bits);
  const steps = [
    {
      id: 'init',
      type: 'state',
      A,
      Q,
      Q1,
      M,
      count: getCountStr(0, bits),
      isInit: true,
      isMathResult: false,
      isFinal: false,
    },
  ];

  for (let i = 0; i < bits; i++) {
    const pair = Q[bits - 1] + Q1;

    if (pair === '01') {
      steps.push({ id: `op_${i}`, type: 'op', opText: '+', opLabel: '+M', opVal: M });
      A = addBinary(A, M);
      steps.push({
        id: `state_math_${i}`,
        type: 'state',
        A,
        Q,
        Q1,
        count: '',
        isInit: false,
        isMathResult: true,
        isFinal: false,
      });
    } else if (pair === '10') {
      steps.push({ id: `op_${i}`, type: 'op', opText: '-', opLabel: '-M', opVal: M });
      A = addBinary(A, MNeg);
      steps.push({
        id: `state_math_${i}`,
        type: 'state',
        A,
        Q,
        Q1,
        count: '',
        isInit: false,
        isMathResult: true,
        isFinal: false,
      });
    }

    steps.push({ id: `arrow_${i}`, type: 'arrow', bits });

    const combined = A[0] + A + Q + Q1;
    A = combined.slice(0, bits);
    Q = combined.slice(bits, bits * 2);
    Q1 = combined.slice(bits * 2, bits * 2 + 1);

    steps.push({
      id: `state_shift_${i}`,
      type: 'state',
      A,
      Q,
      Q1,
      count: i === bits - 1 ? '' : getCountStr(i + 1, bits),
      isInit: false,
      isMathResult: false,
      isFinal: i === bits - 1,
    });
  }

  return {
    steps,
    qValue,
    mValue,
    qBinary: toTwosComplementStr(qValue, bits),
    mBinary: toTwosComplementStr(mValue, bits),
    negMBinary: toTwosComplementStr(-mValue, bits),
  };
};

export default function BoothDefault() {
  const [multiplier, setMultiplier] = useState(-4);
  const [multiplicand, setMultiplicand] = useState(7);
  const [bitSize, setBitSize] = useState(4);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [practicePhase, setPracticePhase] = useState('action');
  const [userInputs, setUserInputs] = useState(createEmptyPracticeInputs());
  const [feedback, setFeedback] = useState(null);

  const boothData = useMemo(
    () => generateBoothSteps(multiplier, multiplicand, bitSize),
    [multiplier, multiplicand, bitSize]
  );

  const { steps, qValue, mValue, qBinary, mBinary, negMBinary } = boothData;
  const finalStep = steps[steps.length - 1];
  const rangeMin = -(2 ** (bitSize - 1));
  const rangeMax = 2 ** (bitSize - 1) - 1;

  const resetPractice = () => {
    setPracticePhase('action');
    setUserInputs(createEmptyPracticeInputs());
    setFeedback(null);
  };

  const resetProgress = () => {
    setCurrentStepIdx(0);
    resetPractice();
  };

  const getActivePair = (index) => {
    const step = steps[index];
    if (step?.type === 'state' && !step.isMathResult && !step.isFinal) {
      return step.Q[step.Q.length - 1] + step.Q1;
    }
    return null;
  };

  const currentPair = (() => {
    for (let index = currentStepIdx; index >= 0; index--) {
      const pair = getActivePair(index);
      if (pair) return pair;
    }
    return getActivePair(0);
  })();

  const pairMeaning =
    currentPair === '01' ? 'A = A + M' : currentPair === '10' ? 'A = A - M' : 'Shift only';

  const handleActionGuess = (guessedAction) => {
    const nextStep = steps[currentStepIdx + 1];
    if (!nextStep) return;

    let correctAction = 'shift';
    if (nextStep.type === 'op') {
      correctAction = nextStep.opText === '+' ? 'add' : 'sub';
    }

    if (guessedAction === correctAction) {
      setFeedback({ type: 'success', msg: 'Correct. Continue with the next table state.' });
      setPracticePhase('evaluate');
      setCurrentStepIdx((prev) => Math.min(prev + 1, steps.length - 1));
      return;
    }

    setFeedback({ type: 'error', msg: 'Incorrect. Decide from the Q[0]Q[-1] pair.' });
  };

  const handleValueSubmit = () => {
    let targetIdx = currentStepIdx + 1;
    while (targetIdx < steps.length && steps[targetIdx].type !== 'state') targetIdx++;
    if (targetIdx >= steps.length) return;

    const targetState = steps[targetIdx];
    const isCorrect =
      userInputs.A === targetState.A &&
      userInputs.Q === targetState.Q &&
      userInputs.Q1 === targetState.Q1;

    if (isCorrect) {
      setFeedback({ type: 'success', msg: 'Excellent. Those register values match.' });
      setCurrentStepIdx(targetIdx);
      setPracticePhase('action');
      setUserInputs(createEmptyPracticeInputs());
      return;
    }

    setFeedback({
      type: 'error',
      msg: 'Incorrect values. Arithmetic right shift must extend the sign bit from A.',
    });
  };

  return (
    <div className="booth-page min-h-screen">
      <div className="workbench-shell flex flex-col xl:flex-row">
        <div className="workbench-sidebar w-full xl:w-96 p-5 shadow-lg xl:min-h-[calc(100vh-7rem)]">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white/70 p-2.5 dark:border-slate-700 dark:bg-slate-950/50">
                <GraduationCap className="h-5 w-5 text-slate-700 dark:text-slate-200" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800 dark:text-slate-200">Booth Default</h1>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Standard table flow</p>
              </div>
            </div>

          <div className="mb-5 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Multiplier (Q)</label>
              <input type="number" value={multiplier} onChange={(event) => { setMultiplier(parseInt(event.target.value, 10) || 0); resetProgress(); }} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Multiplicand (M)</label>
              <input type="number" value={multiplicand} onChange={(event) => { setMultiplicand(parseInt(event.target.value, 10) || 0); resetProgress(); }} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Bit Width</label>
              <select value={bitSize} onChange={(event) => { setBitSize(parseInt(event.target.value, 10)); resetProgress(); }} className={inputClass}>
                <option value={4}>4-bit</option>
                <option value={6}>6-bit</option>
                <option value={8}>8-bit</option>
              </select>
            </div>
          </div>

          <div className="surface-card surface-card--muted mb-5 rounded-[1.35rem] p-4 text-sm text-slate-700 dark:text-slate-300">
            <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              <span>Register setup</span>
              <span>{bitSize} bits</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3"><span>Q</span><span className="font-mono">{qBinary}</span></div>
              <div className="flex items-center justify-between gap-3"><span>M</span><span className="font-mono">{mBinary}</span></div>
              <div className="flex items-center justify-between gap-3"><span>-M</span><span className="font-mono">{negMBinary}</span></div>
              <div className="border-t border-slate-200 pt-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Signed range: {rangeMin} to {rangeMax}
              </div>
            </div>
          </div>

          <div className="truth-table-surface mb-5 rounded-[1.25rem] p-3">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Pair rule</div>
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950">
                    <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Q[0]Q[-1]</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {PAIR_RULES.map(([pair, action]) => (
                    <tr key={pair} className="border-t border-slate-200 dark:border-slate-700">
                      <td className="px-3 py-2 font-mono text-slate-800 dark:text-slate-100">{pair}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

            <div className="mt-auto space-y-4">
            <div className="flex items-center justify-between rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/50">
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Practice Mode</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Answer the next action and state.</div>
              </div>
              <button
                onClick={() => { setIsPracticeMode((prev) => !prev); resetPractice(); }}
                className={`relative h-7 w-14 rounded-full border transition-colors ${isPracticeMode ? 'border-slate-100 bg-slate-100 dark:border-slate-100 dark:bg-slate-100' : 'border-slate-300 bg-slate-300 dark:border-slate-700 dark:bg-slate-800'}`}
                aria-label="Toggle practice mode"
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-slate-900 transition-transform dark:bg-slate-900 ${isPracticeMode ? 'translate-x-8' : 'translate-x-1'}`} />
              </button>
            </div>

            {!isPracticeMode && (
              <div className="grid grid-cols-4 gap-2">
                <button onClick={() => { setCurrentStepIdx(0); resetPractice(); }} className={iconButtonClass} title="Reset">
                  <RotateCcw className="mx-auto h-4 w-4" />
                </button>
                <button onClick={() => { if (currentStepIdx > 0) { setCurrentStepIdx((prev) => prev - 1); resetPractice(); } }} disabled={currentStepIdx === 0} className={iconButtonClass} title="Previous">
                  <ChevronRight className="mx-auto h-4 w-4 rotate-180" />
                </button>
                <button onClick={() => { if (currentStepIdx < steps.length - 1) { setCurrentStepIdx((prev) => prev + 1); resetPractice(); } }} disabled={currentStepIdx === steps.length - 1} className={primaryButtonClass} title="Next">
                  <ChevronRight className="mx-auto h-4 w-4" />
                </button>
                <button onClick={() => { setCurrentStepIdx(steps.length - 1); resetPractice(); }} disabled={currentStepIdx === steps.length - 1} className={primaryButtonClass} title="Run all">
                  <Play className="mx-auto h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="workbench-main flex-1 overflow-x-auto p-4 md:p-6 xl:p-8">
          <div className="mx-auto max-w-5xl">
            <div className="summary-banner mb-4 flex flex-wrap items-center justify-between gap-4 rounded-[1.4rem] p-4 text-sm text-slate-700 dark:text-slate-200">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-white/70 px-3 py-1 font-semibold dark:bg-slate-900/70">Inspect Q[0]Q[-1]</span>
                <span className="rounded-full bg-white/70 px-3 py-1 font-semibold dark:bg-slate-900/70">Apply +/-M when needed</span>
                <span className="rounded-full bg-white/70 px-3 py-1 font-semibold dark:bg-slate-900/70">Arithmetic right shift [A | Q | Q[-1]]</span>
              </div>
              <div className="rounded-full bg-white/70 px-3 py-1 font-mono text-xs dark:bg-slate-900/70">
                Pair {currentPair ?? '--'} {'->'} {pairMeaning}
              </div>
            </div>

            <div className="step-table-surface overflow-hidden rounded-[1.5rem]">
              <table className="w-full border-collapse font-mono text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                    <th className="w-12 px-4 py-3 text-center font-semibold"></th>
                    <th className="border-r border-slate-200 px-2 py-3 text-center font-semibold italic dark:border-slate-700">A</th>
                    <th className="border-r border-slate-200 px-4 py-3 text-center font-semibold italic dark:border-slate-700">Q</th>
                    <th className="border-r border-slate-200 px-4 py-3 text-center font-semibold italic dark:border-slate-700">M</th>
                    <th className="px-4 py-3 text-center font-semibold">COUNT</th>
                  </tr>
                </thead>
                <tbody className="text-base text-slate-800 dark:text-slate-100">
                  {steps.slice(0, currentStepIdx + 1).map((step, index) => {
                    if (step.type === 'state') {
                      const isEvalRow =
                        !step.isFinal &&
                        !step.isMathResult &&
                        (index === currentStepIdx || steps[index + 1]?.type === 'arrow');
                      const rowClass = step.isFinal
                        ? 'table-band-rose'
                        : step.isMathResult
                          ? 'table-band-sky'
                          : isEvalRow
                            ? 'table-band-amber'
                            : '';

                      return (
                        <tr key={step.id} className={`border-b border-slate-100 dark:border-slate-800 ${rowClass}`}>
                          <td className="px-4 py-2 text-center"></td>
                          <td className="flex justify-center border-r border-slate-200 px-2 py-2 dark:border-slate-700">
                            <div className={step.isFinal ? 'rounded border-2 border-slate-900 px-1 py-0.5 dark:border-slate-100' : ''}>
                              {renderBits(step.A)}
                            </div>
                          </td>
                          <td className="border-r border-slate-200 px-4 py-2 text-center dark:border-slate-700">
                            <div className={`flex justify-center ${step.isFinal ? 'inline-block rounded border-2 border-slate-900 px-1 py-0.5 dark:border-slate-100' : ''}`}>
                              {renderQWithBracket(step.Q, step.Q1, Boolean(isEvalRow))}
                            </div>
                          </td>
                          <td className="border-r border-slate-200 px-4 py-2 text-center dark:border-slate-700">
                            {step.M ? renderBits(step.M) : null}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-center">{step.count}</td>
                        </tr>
                      );
                    }

                    if (step.type === 'op') {
                      return (
                        <tr key={step.id} className="table-band-slate border-b border-slate-100 dark:border-slate-800">
                          <td className="px-4 py-2 text-right text-lg font-bold">{step.opText}</td>
                          <td className="flex justify-center border-r border-b border-slate-400 px-2 py-2 dark:border-r-slate-700 dark:border-b-slate-500">
                            {renderBits(step.opVal)}
                          </td>
                          <td className="border-r border-slate-200 dark:border-slate-700"></td>
                          <td className="border-r border-slate-200 px-4 py-2 text-center text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                            {step.opLabel}
                          </td>
                          <td></td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={step.id} className="table-band-violet border-b border-slate-100 text-sm dark:border-slate-800">
                        <td></td>
                        <td className="flex justify-center border-r border-slate-200 px-2 py-1 dark:border-slate-700">
                          <div className="flex table-text-violet">
                            <span className="inline-block w-4 text-center font-bold">↓</span>
                            {Array.from({ length: bitSize - 1 }).map((_, arrowIndex) => (
                              <span key={`a-${arrowIndex}`} className="inline-block w-4 text-center font-bold">↘</span>
                            ))}
                          </div>
                        </td>
                        <td className="border-r border-slate-200 px-4 py-1 text-center dark:border-slate-700">
                          <div className="flex justify-center table-text-violet">
                            {Array.from({ length: bitSize }).map((_, arrowIndex) => (
                              <span key={`q-${arrowIndex}`} className="inline-block w-4 text-center font-bold">↘</span>
                            ))}
                            <span className="inline-block w-2"></span>
                            <span className="inline-block w-4 text-center font-bold">↘</span>
                          </div>
                        </td>
                        <td className="border-r border-slate-200 px-4 py-1 text-center text-sm font-semibold dark:border-slate-700">ARS</td>
                        <td></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {currentStepIdx === steps.length - 1 && (
              <div className="surface-card mt-4 rounded-[1.5rem] p-6 text-center">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Multiplication Complete</h3>
                <p className="mt-3 text-slate-700 dark:text-slate-300">
                  Final result:
                  <span className="ml-2 rounded border border-slate-200 bg-white px-2 py-1 font-mono dark:border-slate-700 dark:bg-slate-950/50">
                    {finalStep.A} {finalStep.Q}
                  </span>
                </p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Decimal: <strong className="text-slate-800 dark:text-slate-100">{qValue * mValue}</strong>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {isPracticeMode && currentStepIdx < steps.length - 1 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-950/92">
          <div className="mx-auto max-w-5xl">
            <div className="mb-3 flex items-center gap-3">
              <StepForward className="h-5 w-5 text-slate-700 dark:text-slate-200" />
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Your Turn</h3>
            </div>

            {feedback && (
              <div className={`mb-4 flex items-center gap-2 rounded p-3 text-sm ${feedback.type === 'success' ? 'feedback-success' : 'feedback-error'}`}>
                {feedback.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {feedback.msg}
              </div>
            )}

            {practicePhase === 'action' ? (
              <div>
                <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">Look at the highlighted pair Q[0]Q[-1]. Which action should happen next?</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => handleActionGuess('add')} className="choice-button-positive rounded-lg border-2 px-4 py-2 text-sm font-medium">A = A + M</button>
                  <button onClick={() => handleActionGuess('sub')} className="choice-button-negative rounded-lg border-2 px-4 py-2 text-sm font-medium">A = A - M</button>
                  <button onClick={() => handleActionGuess('shift')} className="rounded-lg border-2 border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-950">Shift Only</button>
                </div>
              </div>
            ) : (
              <div>
                <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">Calculate the next register values shown by the table.</p>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">New A</label>
                    <input type="text" maxLength={bitSize} value={userInputs.A} onChange={(event) => setUserInputs((prev) => ({ ...prev, A: event.target.value.replace(/[^01]/g, '') }))} className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-center font-mono tracking-[0.2em] dark:border-slate-600 dark:bg-slate-900" placeholder={'0'.repeat(bitSize)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">New Q</label>
                    <input type="text" maxLength={bitSize} value={userInputs.Q} onChange={(event) => setUserInputs((prev) => ({ ...prev, Q: event.target.value.replace(/[^01]/g, '') }))} className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-center font-mono tracking-[0.2em] dark:border-slate-600 dark:bg-slate-900" placeholder={'0'.repeat(bitSize)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">New Q[-1]</label>
                    <input type="text" maxLength={1} value={userInputs.Q1} onChange={(event) => setUserInputs((prev) => ({ ...prev, Q1: event.target.value.replace(/[^01]/g, '') }))} className="w-14 rounded-lg border border-slate-300 px-3 py-2 text-center font-mono dark:border-slate-600 dark:bg-slate-900" placeholder="0" />
                  </div>
                  <button onClick={handleValueSubmit} className={primaryButtonClass}>Check Answer</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
