import React, { useMemo, useState } from "react";
import {
  Play,
  StepForward,
  RotateCcw,
  CheckCircle,
  XCircle,
  GraduationCap,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import HoverInfo from '../components/ui/HoverInfo';
import ConversionCard from '../components/ui/ConversionCard';
import ResultVerificationInfo from '../components/ui/ResultVerificationInfo';
import {
  addBinaryStr,
  getTwosComplementStr,
  getOvr,
  getCountStr,
  requiredBitsForSignedInt,
  intToC2,
  intToSM,
  c2ToInt,
  gcd,
  scaleFractionToFixedInt,
  getFractionalData,
  getSmToC2Explanation,
} from '../utils/binaryHelpers';

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm outline-none transition ' +
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
      ? "bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900"
      : "border border-slate-200 bg-white/80 text-slate-700 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300"
  }`;

const getNextR = (x_i1, x_i, R) => {
  const b1 = Number(x_i1);
  const b0 = Number(x_i);
  const r = Number(R);

  // R* is the majority function over the current recoding window.
  return ((b1 & b0) | (b1 & r) | (b0 & r)).toString();
};

const getBoothOperation = (x_i1, x_i, R) => {
  const b1 = Number(x_i1);
  const b0 = Number(x_i);
  const r = Number(R);
  const R_star = getNextR(b1, b0, r);
  const op = (b0 ^ r) === 0 ? 0 : b1 === 0 ? 1 : -1;

  return { op, R_star };
};

const chooseRadix3Bits = (qVal, mVal) =>
  Math.max(
    2,
    requiredBitsForSignedInt(qVal),
    requiredBitsForSignedInt(mVal),
    requiredBitsForSignedInt(-mVal)
  );

const RADIX3_TRUTH_ROWS = [
  [0, 0, 0],
  [0, 0, 1],
  [0, 1, 0],
  [0, 1, 1],
  [1, 0, 0],
  [1, 0, 1],
  [1, 1, 0],
  [1, 1, 1],
].map(([x_i1, x_i, R]) => {
  const { op, R_star } = getBoothOperation(x_i1, x_i, R);

  return [x_i1, x_i, R, op === 1 ? "+1" : op === -1 ? "-1" : "0", Number(R_star)];
});

const generateModifiedBoothSteps = (Q_bin, M_bin, bits) => {
  const steps = [];
  const lastDisplayedCount = Math.max(0, bits - 1);

  let A = "0".repeat(bits);
  let Q = Q_bin;
  let Q_extra = Q_bin[0]; // Q[bits], starts from sign bit of Q
  let R = "0";

  const M = M_bin;
  const M_neg = getTwosComplementStr(M_bin);

  // sign-extended multiplier
  const X_ext = Q_bin[0] + Q_bin;

  steps.push({
    id: "init",
    type: "state",
    blockId: 0,
    count: getCountStr(0, lastDisplayedCount),
    ovr: "0",
    A,
    Q_extra,
    Q,
    R,
    M,
    isInit: true,
    isFinal: false,
    isRedBox: false,
    evalCtx: null,
    shiftMeta: null,
  });

  for (let i = 0; i < bits; i++) {
    const prevR = R;
    const x_i = X_ext[bits - i];
    const x_i1 = X_ext[bits - 1 - i];

    const { op, R_star } = getBoothOperation(x_i1, x_i, prevR);

    let A_sum = A;
    let ovr = "0";

    if (op !== 0) {
      const operand = op === 1 ? M : M_neg;
      const addRes = addBinaryStr(A, operand);

      A_sum = addRes.result;
      ovr = getOvr(A, operand, A_sum);

      steps.push({
        id: `op_${i}`,
        type: "op",
        blockId: i,
        count: "",
        ovr,
        A_before: A,
        A_operand: operand,
        A_sum,
        opType: op === 1 ? "+M" : "-M",
        Q_extra_before: Q_extra,
        Q_before: Q,
        R_before: prevR,
        R_after: R_star,
        evalCtx: { x_i1, x_i, prevR, op, R_star },
      });
    }

    const oldQExtra = Q_extra;
    const oldQ = Q;

    const correctedMsb = (Number(A_sum[0]) ^ Number(ovr)).toString();
    const shiftedA = correctedMsb + A_sum.substring(0, bits - 1);
    const new_Q_extra = A_sum[bits - 1];
    const shiftedQ = oldQExtra + oldQ.substring(0, bits - 1);

    A = shiftedA;
    Q_extra = new_Q_extra;
    Q = shiftedQ;
    R = R_star;

    const isFinal = i === bits - 1;

    steps.push({
      id: `state_shift_${i}`,
      type: "state",
      blockId: i,
      count: isFinal ? "" : getCountStr(i + 1, lastDisplayedCount),
      ovr,
      A,
      Q_extra,
      Q,
      R,
      isInit: false,
      isFinal,
      isRedBox: isFinal,
      evalCtx: { x_i1, x_i, prevR, op, R_star },
      shiftMeta: {
        sumMsb: A_sum[0],
        ovr,
        correctedMsb,
        aLsb: A_sum[bits - 1],
        oldQExtra,
        oldQMsbAfterShift: shiftedQ[0],
        prevR,
        nextR: R_star,
        opText: op === 1 ? "+M" : op === -1 ? "-M" : "0",
      },
    });
  }

  return steps;
};

export default function App() {
  const [mode, setMode] = useState("integer");

  // Integer mode
  const [xInt, setXInt] = useState(-105);
  const [yInt, setYInt] = useState(-123);

  // Fractional mode
  const [qNum, setQNum] = useState(-101);
  const [qDen, setQDen] = useState(128);
  const [mNum, setMNum] = useState(-44);
  const [mDen, setMDen] = useState(64);

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [showTruthTable, setShowTruthTable] = useState(true);

  // Practice mode
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [practicePhase, setPracticePhase] = useState("action");
  const [userInputs, setUserInputs] = useState({
    ovr: "",
    A: "",
    Q_extra: "",
    Q: "",
    R: "",
  });
  const [feedback, setFeedback] = useState(null);
  const [bitWidthMode, setBitWidthMode] = useState("auto");
  const [manualBitSize, setManualBitSize] = useState(8);

  const isFractional = mode === "fractional";

  const derived = useMemo(() => {
    let bitSize;
    let autoBitSize;
    let fracBits = 0;
    let qC2;
    let mC2;
    let qSM;
    let mSM;
    let mNegC2;
    let expectedProduct;
    let note = "";
    let qBinaryValue;
    let mBinaryValue;
    let qRegisterLabel;
    let mRegisterLabel;

    if (isFractional) {
      fracBits = Math.max(
        1,
        Math.ceil(Math.log2(Math.max(1, qDen))),
        Math.ceil(Math.log2(Math.max(1, mDen)))
      );

      const qScaled = scaleFractionToFixedInt(qNum, qDen, fracBits);
      const mScaled = scaleFractionToFixedInt(mNum, mDen, fracBits);

      autoBitSize = chooseRadix3Bits(qScaled, mScaled);
      bitSize = bitWidthMode === "manual" ? Math.max(autoBitSize, manualBitSize) : autoBitSize;

      const qData = getFractionalData(qNum, qDen, fracBits, bitSize);
      const mData = getFractionalData(mNum, mDen, fracBits, bitSize);

      qC2 = qData.c2;
      mC2 = mData.c2;
      qSM = qData.sm;
      mSM = mData.sm;
      mNegC2 = intToC2(-mData.scaledNum, bitSize);

      expectedProduct = (qNum / Math.max(1, qDen)) * (mNum / Math.max(1, mDen));
      note =
        bitWidthMode === "manual"
          ? `Fractional mode uses fixed-point scaling. Width locked to ${bitSize} bits (auto minimum ${autoBitSize}).`
          : `Fractional mode uses fixed-point scaling. Best with denominators that are powers of 2. Width = ${bitSize} bits (auto).`;

      qBinaryValue = qData.scaledNum;
      mBinaryValue = mData.scaledNum;
      qRegisterLabel = `register value = ${qData.scaledNum} = ${qData.scaledNum}/2^${fracBits}`;
      mRegisterLabel = `register value = ${mData.scaledNum} = ${mData.scaledNum}/2^${fracBits}`;
    } else {
      autoBitSize = chooseRadix3Bits(xInt, yInt);
      bitSize = bitWidthMode === "manual" ? Math.max(autoBitSize, manualBitSize) : autoBitSize;

      qC2 = intToC2(xInt, bitSize);
      mC2 = intToC2(yInt, bitSize);
      qSM = intToSM(xInt, bitSize);
      mSM = intToSM(yInt, bitSize);
      mNegC2 = intToC2(-yInt, bitSize);

      expectedProduct = xInt * yInt;
      note =
        bitWidthMode === "manual"
          ? `Register width locked to ${bitSize} bits (auto minimum ${autoBitSize}).`
          : `Bit width is chosen automatically from the operands (${bitSize} bits).`;

      qBinaryValue = xInt;
      mBinaryValue = yInt;
      qRegisterLabel = `register value = ${xInt}`;
      mRegisterLabel = `register value = ${yInt}`;
    }

    return {
      bitSize,
      autoBitSize,
      fracBits,
      qC2,
      mC2,
      qSM,
      mSM,
      mNegC2,
      expectedProduct,
      note,
      qBinaryValue,
      mBinaryValue,
      qRegisterLabel,
      mRegisterLabel,
    };
  }, [isFractional, xInt, yInt, qNum, qDen, mNum, mDen, bitWidthMode, manualBitSize]);

  const {
    bitSize,
    autoBitSize,
    fracBits,
    qC2,
    mC2,
    qSM,
    mSM,
    mNegC2,
    expectedProduct,
    note,
    qBinaryValue,
    mBinaryValue,
    qRegisterLabel,
    mRegisterLabel,
  } = derived;

  const qConversion = useMemo(
    () => getSmToC2Explanation(qBinaryValue, bitSize),
    [qBinaryValue, bitSize]
  );

  const mConversion = useMemo(
    () => getSmToC2Explanation(mBinaryValue, bitSize),
    [mBinaryValue, bitSize]
  );

  const steps = useMemo(
    () => generateModifiedBoothSteps(qC2, mC2, bitSize),
    [qC2, mC2, bitSize]
  );

  const stepIndexById = useMemo(() => {
    const lookup = {};
    steps.forEach((step, index) => {
      lookup[step.id] = index;
    });
    return lookup;
  }, [steps]);

  const tableBlocks = useMemo(() => {
    const stepById = {};
    steps.forEach((step) => {
      stepById[step.id] = step;
    });

    const blocks = [];
    let preState = stepById.init;
    const lastDisplayedCount = Math.max(0, bitSize - 1);

    for (let i = 0; i < bitSize && preState; i++) {
      const opStep = stepById[`op_${i}`] ?? null;
      const postState = stepById[`state_shift_${i}`];

      blocks.push({
        id: `block_${i}`,
        blockId: i,
        count: getCountStr(i, lastDisplayedCount),
        preState,
        opStep,
        postState,
        startIndex: stepIndexById[preState.id] ?? 0,
        opIndex: opStep ? stepIndexById[opStep.id] : null,
        endIndex: postState ? (stepIndexById[postState.id] ?? stepIndexById[preState.id]) : stepIndexById[preState.id],
        isFinal: i === bitSize - 1,
      });

      preState = postState;
    }

    return blocks;
  }, [steps, bitSize, stepIndexById]);

  const resetPractice = () => {
    setPracticePhase("action");
    setUserInputs({
      ovr: "",
      A: "",
      Q_extra: "",
      Q: "",
      R: "",
    });
    setFeedback(null);
  };

  const resetProgress = () => {
    setCurrentStepIdx(0);
    resetPractice();
  };

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    resetProgress();
  };

  const handleSignedInput = (setter) => (event) => {
    setter(parseInt(event.target.value, 10) || 0);
    resetProgress();
  };

  const handlePositiveInput = (setter) => (event) => {
    setter(Math.max(1, parseInt(event.target.value, 10) || 1));
    resetProgress();
  };

  const handleBitWidthModeChange = (nextMode) => {
    setBitWidthMode(nextMode);
    resetProgress();
  };

  const handleManualBitSizeChange = (event) => {
    const parsed = parseInt(event.target.value, 10);
    setManualBitSize(Number.isFinite(parsed) ? Math.max(2, parsed) : 2);
    resetProgress();
  };

  const nextStep = () => {
    if (currentStepIdx < steps.length - 1) {
      setCurrentStepIdx((prev) => prev + 1);
      resetPractice();
    }
  };

  const prevStep = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx((prev) => prev - 1);
      resetPractice();
    }
  };

  const jumpToStart = () => {
    setCurrentStepIdx(0);
    resetPractice();
  };

  const runAll = () => {
    if (steps.length > 0) {
      setCurrentStepIdx(steps.length - 1);
      resetPractice();
    }
  };

  const renderBits = (
    bitStr,
    {
      highlightMsb = false,
      qGroup = false,
      emphasizeLast = false,
      highlightIndices = [],
      bitClassMap = {},
      color = "text-slate-800 dark:text-slate-100",
    } = {}
  ) => {
    if (!bitStr) return null;

    return (
      <span className={`radix3-bits inline-flex items-center font-mono text-[17px] leading-5 ${color}`}>
        {bitStr.split("").map((b, i) => {
          const addGap =
            qGroup
              ? i > 0 && (bitStr.length - i) % 4 === 0
              : i > 0 && i % 4 === 0;

          return (
            <span
              key={`${bitStr}-${i}`}
              className={[
                "inline-flex items-center justify-center w-[18px]",
                addGap ? "ml-2" : "",
                i === 0 && highlightMsb ? "text-slate-700 dark:text-slate-200 font-bold" : "",
                emphasizeLast && i === bitStr.length - 1 ? "underline underline-offset-2" : "",
                highlightIndices.includes(i)
                  ? "rounded-full border border-cyan-400/70 bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-200"
                  : "",
                bitClassMap[i] ?? "",
              ].join(" ")}
            >
              {b}
            </span>
          );
        })}
      </span>
    );
  };

  const TinyLine = ({ children, color = "text-slate-500", mono = true }) => (
    <div className={`radix3-tiny-line text-[11px] leading-4 mt-1 ${color} ${mono ? "font-mono" : ""}`}>
      {children}
    </div>
  );

  const MainSlot = ({ children }) => (
    <div className="radix3-main-slot min-h-[32px] w-full flex items-center justify-center">
      {children}
    </div>
  );

  const NoteSlot = ({ children }) => (
    <div className="radix3-note-slot min-h-[18px] w-full flex items-center justify-center">
      {children}
    </div>
  );

  const getDisplayedOpText = (opType) => {
    if (opType === "+M") return "A + M";
    if (opType === "-M") return "A - M";
    return "0";
  };



  const getFinalProduct = () => {
    if (steps.length === 0) return null;

    const finalStep = steps[steps.length - 1];
    if (finalStep.type !== "state") return null;

    const productBin =
      finalStep.A + finalStep.Q_extra + finalStep.Q.substring(0, bitSize - 1);

    const raw = c2ToInt(productBin);

    const base = {
      binary: productBin,
      raw,
      A: finalStep.A,
      Q_extra: finalStep.Q_extra,
      Q: finalStep.Q,
      display: `${finalStep.A}.${finalStep.Q_extra}${finalStep.Q.substring(
        0,
        bitSize - 1
      )}`,
    };

    if (mode === "fractional") {
      const denom = 2 ** (2 * fracBits);
      const g = gcd(raw, denom);

      return {
        ...base,
        decimal: raw / denom,
        fractionText: `${raw / g}/${denom / g}`,
        denom,
      };
    }

    return {
      ...base,
      decimal: raw,
    };
  };

  const finalProduct = getFinalProduct();

  const getEvalCtxFromState = (step) => {
    if (!step || step.type !== "state" || step.isFinal) return null;

    const qLen = step.Q?.length ?? 0;
    if (qLen === 0) return null;

    const x_i = step.Q[qLen - 1];
    const x_i1 = step.Q[Math.max(0, qLen - 2)];
    const prevR = step.R;
    const { op, R_star } = getBoothOperation(x_i1, x_i, prevR);

    return { x_i1, x_i, prevR, op, R_star };
  };

  const currentStep = steps[currentStepIdx];

  const getCurrentEvalCtx = () => {
    const step = currentStep;

    if (step?.type === "state") return getEvalCtxFromState(step);
    if (step?.evalCtx) return step.evalCtx;

    if (currentStepIdx + 1 < steps.length) {
      const nextStep = steps[currentStepIdx + 1];
      if (nextStep?.type === "state") return getEvalCtxFromState(nextStep);
      if (nextStep?.evalCtx) return nextStep.evalCtx;
    }

    return null;
  };

  const currentEvalCtx = getCurrentEvalCtx();
  const isFinalView = !!finalProduct && currentStepIdx === steps.length - 1;

  const activeBlockId =
    currentStep?.type === "op"
      ? currentStep.blockId
      : tableBlocks.find((block) => block.preState.id === currentStep?.id)?.blockId ??
        tableBlocks.find((block) => block.postState?.id === currentStep?.id)?.blockId ??
        null;

  const handleActionGuess = (guessedAction) => {
    const nextStepObj = steps[currentStepIdx + 1];
    if (!nextStepObj) return;

    let correctAction = "shift";

    if (nextStepObj.type === "op") {
      correctAction = nextStepObj.opType === "-M" ? "sub" : "add";
    }

    if (guessedAction === correctAction) {
      setFeedback({ type: "success", msg: "Correct!" });
      setPracticePhase("evaluate");
      setCurrentStepIdx((prev) => prev + 1);
    } else {
      setFeedback({ type: "error", msg: "Incorrect. Check the truth table." });
    }
  };

  const handleValueSubmit = () => {
    let targetIdx = currentStepIdx;

    if (steps[targetIdx]?.type === "op") {
      targetIdx++;
    }

    if (targetIdx >= steps.length) return;

    const targetState = steps[targetIdx];

    const isCorrect =
      userInputs.A === targetState.A &&
      userInputs.Q === targetState.Q &&
      userInputs.R === targetState.R &&
      userInputs.ovr === targetState.ovr &&
      userInputs.Q_extra === targetState.Q_extra;

    if (isCorrect) {
      setFeedback({ type: "success", msg: "Correct!" });
      setCurrentStepIdx(targetIdx);
      setPracticePhase("action");
      setUserInputs({
        ovr: "",
        A: "",
        Q_extra: "",
        Q: "",
        R: "",
      });
    } else {
      setFeedback({
        type: "error",
        msg: "Incorrect. Remember: A[MSB] after shift = Sum[MSB] XOR OVR",
      });
    }
  };

  const tableRows = RADIX3_TRUTH_ROWS;

  const algorithmPseudo = `Regs: A[bits-1:0], M[bits-1:0], Q[bits:0], R, COUNT

BEGIN:
  A = 0, R = 0, COUNT = 0, M = INBUS
  Q[bits-1:0] = INBUS, Q[bits] = Q[bits-1]

SCAN:
  R* = (Q[1] & Q[0]) | (Q[1] & R) | (Q[0] & R)

  if Q[1:0]R = 001 or 010 then
    A = A + M

  if Q[1:0]R = 101 or 110 then
    A = A - M

  R = R*

SHIFT:
  A[bits-2:0], Q[bits:0] = A_sum[bits-1:0], Q[bits:1]
  A[bits-1] = A_sum[bits-1] XOR OVR

  if COUNT = bits - 1 then goto OUTPUT
  COUNT++, goto SCAN

OUTPUT:
  OUTBUS = A
  OUTBUS = Q[bits:1]`;

  return (
    <div className="booth-page booth-radix3-page min-h-screen">
      <div className="workbench-shell flex flex-col xl:flex-row">
        {/* Sidebar */}
        <div className="workbench-sidebar w-full xl:w-96 p-5 shadow-lg xl:min-h-[calc(100vh-7rem)]">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-2.5 dark:border-slate-700 dark:bg-slate-950/50">
              <GraduationCap className="h-5 w-5 text-slate-700 dark:text-slate-200" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 dark:text-slate-200">Booth Radix-3</h1>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Integer and fixed-point
              </p>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="mb-5 flex rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-950/50">
            <button
              onClick={() => handleModeChange("integer")}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${mode === "integer"
                ? "bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
            >
              Integer
            </button>

            <button
              onClick={() => handleModeChange("fractional")}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${mode === "fractional"
                ? "bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
            >
              Fractional
            </button>
          </div>

          {/* Inputs */}
          {mode === "integer" ? (
            <div className="space-y-3 mb-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    X (Multiplier)
                  </label>
                  <input
                    type="number"
                    value={xInt}
                    onChange={handleSignedInput(setXInt)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Y (Multiplicand)
                  </label>
                  <input
                    type="number"
                    value={yInt}
                    onChange={handleSignedInput(setYInt)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Bit Width
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleBitWidthModeChange("auto")}
                      className={toggleButtonClass(bitWidthMode === "auto")}
                    >
                      Auto
                    </button>
                    <button
                      onClick={() => handleBitWidthModeChange("manual")}
                      className={toggleButtonClass(bitWidthMode === "manual")}
                    >
                      Manual
                    </button>
                  </div>

                  {bitWidthMode === "manual" && (
                    <input
                      type="number"
                      min={Math.max(2, autoBitSize)}
                      value={manualBitSize}
                      onChange={handleManualBitSizeChange}
                      className={inputClass}
                    />
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
                      Auto minimum: {autoBitSize}
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
                      Using now: {bitSize}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 mb-5">
              <div className="grid grid-cols-5 gap-2 items-end">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Q Num
                  </label>
                  <input
                    type="number"
                    value={qNum}
                    onChange={handleSignedInput(setQNum)}
                    className={inputClass}
                  />
                </div>
                <span className="text-slate-400 text-center pb-2">/</span>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Q Den
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={qDen}
                    onChange={handlePositiveInput(setQDen)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2 items-end">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    M Num
                  </label>
                  <input
                    type="number"
                    value={mNum}
                    onChange={handleSignedInput(setMNum)}
                    className={inputClass}
                  />
                </div>
                <span className="text-slate-400 text-center pb-2">/</span>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    M Den
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={mDen}
                    onChange={handlePositiveInput(setMDen)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Register Width
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleBitWidthModeChange("auto")}
                      className={toggleButtonClass(bitWidthMode === "auto")}
                    >
                      Auto
                    </button>
                    <button
                      onClick={() => handleBitWidthModeChange("manual")}
                      className={toggleButtonClass(bitWidthMode === "manual")}
                    >
                      Manual
                    </button>
                  </div>
                </div>

                {bitWidthMode === "manual" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Manual Bits
                    </label>
                    <input
                      type="number"
                      min={Math.max(2, autoBitSize)}
                      value={manualBitSize}
                      onChange={handleManualBitSizeChange}
                      className={inputClass}
                    />
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Fractional Bits
                    </label>
                    <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
                      {fracBits} bits (auto)
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Auto Minimum
                    </label>
                    <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
                      {autoBitSize} bits
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Total Register Bits
                    </label>
                    <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
                      {bitSize} bits
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Binary summary */}
          <div className="sidebar-surface rounded-[1.25rem] p-4 mb-5 text-xs space-y-3">
            <div className="pb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2">
                <span>
                  X = {mode === "integer" ? xInt : `${qNum}/${qDen}`} (Q - Multiplier)
                </span>
              </div>

              <div className="font-mono text-slate-600 dark:text-slate-400 flex justify-between">
                <span>SM:</span>
                <span>{qSM}</span>
              </div>

              <div className="font-mono text-slate-600 dark:text-slate-400 flex justify-between">
                <span>C2:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{qC2}</span>
              </div>
            </div>

            <div className="pb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Y = {mode === "integer" ? yInt : `${mNum}/${mDen}`} (M - Multiplicand)
              </div>

              <div className="font-mono text-slate-600 dark:text-slate-400 flex justify-between">
                <span>SM:</span>
                <span>{mSM}</span>
              </div>

              <div className="font-mono text-slate-600 dark:text-slate-400 flex justify-between">
                <span>C2:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{mC2}</span>
              </div>

              <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 font-mono text-red-600 dark:border-slate-700 dark:text-red-400">
                <span>-M:</span>
                <span className="font-semibold">{mNegC2}</span>
              </div>
            </div>

            <div className="text-amber-700 dark:text-amber-400">{note}</div>

            {finalProduct && currentStepIdx === steps.length - 1 && (
              <div className="pt-1">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {mode === "fractional"
                    ? `Product = ${finalProduct.fractionText} ≈ ${finalProduct.decimal.toFixed(
                      6
                    )}`
                    : `Product = ${finalProduct.decimal}`}
                </div>

                <div className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1">
                  A[{bitSize - 1}:0].Q[{bitSize}:1]
                </div>

                <div className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {finalProduct.display}
                </div>

                <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                  <span>Highlighted Result</span>
                  <ResultVerificationInfo
                    binary={finalProduct.binary}
                    scalePower={mode === "fractional" ? 2 * fracBits : 0}
                    align="right"
                  />
                </div>

                <div className="mt-1 inline-flex max-w-full break-all rounded-2xl border-2 border-emerald-400/70 bg-emerald-50/80 px-3 py-2 font-mono text-sm tracking-[0.2em] text-emerald-800 shadow-sm dark:border-emerald-500/40 dark:bg-emerald-950/30 dark:text-emerald-100">
                  {finalProduct.binary}
                </div>

                <div className="text-xs mt-1 text-slate-600">
                  Expected ≈{" "}
                  {mode === "fractional"
                    ? expectedProduct.toFixed(6)
                    : expectedProduct}
                </div>
              </div>
            )}
          </div>

          {/* SM -> C2 conversions */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-sm font-semibold text-slate-700">
                SM → C2 Conversions
              </div>
              <HoverInfo title="Why this is shown">
                <div className="space-y-2">
                  <div>
                    Your algorithm works with <span className="font-semibold">C2</span>,
                    but many examples start from <span className="font-semibold">SM</span>.
                  </div>
                  <div>
                    For negative numbers:
                    <span className="font-mono block mt-1">
                      full-width |x| → invert → +1 → C2
                    </span>
                  </div>
                </div>
              </HoverInfo>
            </div>

            <div className="space-y-3">
              <ConversionCard
                title="X / Q"
                inputLabel={mode === "integer" ? `${xInt}` : `${qNum}/${qDen}`}
                registerLabel={qRegisterLabel}
                conv={qConversion}
              />

              <ConversionCard
                title="Y / M"
                inputLabel={mode === "integer" ? `${yInt}` : `${mNum}/${mDen}`}
                registerLabel={mRegisterLabel}
                conv={mConversion}
              />
            </div>
          </div>

          {/* Truth table */}
          <div className="mb-5">
            <button
              onClick={() => setShowTruthTable(!showTruthTable)}
              className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform ${showTruthTable ? "" : "-rotate-90"
                  }`}
              />
              Truth Table
            </button>

            {showTruthTable && (
              <div className="truth-table-surface rounded-[1.25rem] p-2 overflow-x-auto">
                <table className="w-full text-xs text-center font-mono">
                  <thead>
                    <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                      <th className="py-1 px-1">x₍i+1₎</th>
                      <th className="py-1 px-1">xᵢ</th>
                      <th className="py-1 px-1">R</th>
                      <th className="py-1 px-1">OP</th>
                      <th className="py-1 px-1">R*</th>
                    </tr>
                  </thead>

                  <tbody className="text-slate-700">
                    {tableRows.map((row, i) => {
                      const highlighted =
                        currentEvalCtx &&
                        Number(currentEvalCtx.x_i1) === row[0] &&
                        Number(currentEvalCtx.x_i) === row[1] &&
                        Number(currentEvalCtx.prevR) === row[2];

                      return (
                        <tr
                          key={i}
                          className={`border-b border-slate-100 dark:border-slate-800 ${highlighted ? "bg-yellow-100 dark:bg-yellow-900/30 font-bold" : ""
                            }`}
                        >
                          <td className="py-1">{row[0]}</td>
                          <td className="py-1">{row[1]}</td>
                          <td className="py-1">{row[2]}</td>
                          <td
                            className={`py-1 ${row[3] === "+1"
                              ? "text-slate-900 dark:text-slate-100"
                              : row[3] === "-1"
                                ? "text-red-600 dark:text-red-400"
                                : ""
                              }`}
                          >
                            {row[3]}
                          </td>
                          <td className="py-1">{row[4]}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="space-y-3 mt-auto">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/50">
              <span className="text-sm font-medium text-slate-700">
                Practice Mode
              </span>
              <button
                onClick={() => setIsPracticeMode(!isPracticeMode)}
                className={`relative h-6 w-11 rounded-full border transition-colors ${isPracticeMode ? "border-slate-100 bg-slate-100 dark:border-slate-100 dark:bg-slate-100" : "border-slate-300 bg-slate-300 dark:border-slate-700 dark:bg-slate-800"
                  }`}
              >
                <div
                  className={`absolute top-1 h-4 w-4 rounded-full bg-slate-900 transition-transform shadow-sm dark:bg-slate-900 ${isPracticeMode ? "translate-x-6" : "translate-x-1"
                    }`}
                />
              </button>
            </div>

            {!isPracticeMode && (
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={jumpToStart}
                  className={iconButtonClass}
                  title="Reset"
                >
                  <RotateCcw className="w-4 h-4 mx-auto" />
                </button>

                <button
                  onClick={prevStep}
                  disabled={currentStepIdx === 0}
                  className={iconButtonClass}
                  title="Previous"
                >
                  <ChevronRight className="w-4 h-4 mx-auto rotate-180" />
                </button>

                <button
                  onClick={nextStep}
                  disabled={currentStepIdx === steps.length - 1}
                  className={primaryButtonClass}
                  title="Next"
                >
                  <ChevronRight className="w-4 h-4 mx-auto" />
                </button>

                <button
                  onClick={runAll}
                  disabled={currentStepIdx === steps.length - 1}
                  className={primaryButtonClass}
                  title="Run All"
                >
                  <Play className="w-4 h-4 mx-auto" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main */}
        <div className="workbench-main flex-1 overflow-x-auto p-4 md:p-6 xl:p-8">
          <div className="max-w-5xl mx-auto">
            <div className="radix3-export-summary mb-4 rounded-[1.35rem] border border-slate-200 bg-white/90 p-4 text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-200">
              <div className="radix3-export-summary-grid grid gap-3 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    View
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {mode === "integer" ? "Integer" : "Fractional"} | {bitSize} bits
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Auto min {autoBitSize}
                    {isFractional ? ` | frac ${fracBits}` : ""}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    X / Q
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {mode === "integer" ? xInt : `${qNum}/${qDen}`}
                  </div>
                  <div className="mt-1 font-mono text-xs text-slate-600 dark:text-slate-300">
                    C2 {qC2}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Y / M
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {mode === "integer" ? yInt : `${mNum}/${mDen}`}
                  </div>
                  <div className="mt-1 font-mono text-xs text-slate-600 dark:text-slate-300">
                    C2 {mC2}
                  </div>
                  <div className="mt-1 font-mono text-xs text-rose-600 dark:text-rose-300">
                    -M {mNegC2}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    {isFinalView ? "Result" : "Step"}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {isFinalView
                      ? mode === "fractional"
                        ? finalProduct.fractionText
                        : finalProduct.decimal
                      : currentStep?.count || "Init"}
                  </div>
                  <div className="mt-1 font-mono text-xs text-slate-600 dark:text-slate-300">
                    {isFinalView ? finalProduct.binary : `A[${bitSize - 1}:0].Q[${bitSize}:1]`}
                  </div>
                </div>
              </div>
            </div>

            <div className="summary-banner radix3-summary-banner mb-4 flex flex-wrap items-center justify-between gap-4 rounded-[1.4rem] p-4 text-sm text-slate-700 dark:text-slate-200">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <span className="font-semibold">Shift Formula:</span>
                  <code className="ml-2 rounded bg-white/80 px-2 py-0.5 dark:bg-slate-950/50 dark:text-slate-100">
                    A[MSB] = Sum[MSB] ⊕ OVR
                  </code>
                </div>

                <div>
                  <span className="font-semibold">Result:</span>
                  <code className="ml-2 rounded bg-white/80 px-2 py-0.5 dark:bg-slate-950/50 dark:text-slate-100">
                    A[{bitSize - 1}:0].Q[{bitSize}:1]
                  </code>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-200">Pseudo-code</span>
                <HoverInfo title="Modified Booth pseudo-code" align="right">
                  <pre className="whitespace-pre-wrap font-mono text-xs leading-5 text-slate-700 dark:text-slate-300">
                    {algorithmPseudo}
                  </pre>
                </HoverInfo>
              </div>
            </div>

            <div className="step-table-surface radix3-step-table rounded-[1.5rem] overflow-hidden">
              <table className="w-full text-sm">
                <colgroup>
                  <col className="w-[90px]" />
                  <col className="w-[70px]" />
                  <col className="w-[280px]" />
                  <col className="w-[90px]" />
                  <col className="w-[250px]" />
                  <col className="w-[80px]" />
                  <col className="w-[140px]" />
                </colgroup>
                <thead>
                  <tr className="bg-slate-50/90 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                    <th className="py-3 px-3 text-center font-semibold border-r border-slate-200 dark:border-slate-700">
                      COUNT
                    </th>
                    <th className="py-3 px-3 text-center font-semibold border-r border-slate-200 dark:border-slate-700">
                      OVR
                    </th>
                    <th className="py-3 px-4 text-center font-semibold border-r border-slate-200 dark:border-slate-700">
                      A
                    </th>
                    <th className="table-band-emerald py-3 px-2 text-center font-semibold border-r border-slate-200 dark:border-slate-700">
                      Q[{bitSize}]
                    </th>
                    <th className="py-3 px-4 text-center font-semibold border-r border-slate-200 dark:border-slate-700">
                      Q
                    </th>
                    <th className="py-3 px-3 text-center font-semibold border-r border-slate-200 dark:border-slate-700 text-red-600 dark:text-red-400">
                      R
                    </th>
                    <th className="py-3 px-4 text-center font-semibold">M</th>
                  </tr>
                </thead>

                <tbody className="font-mono">
                  {tableBlocks
                    .filter((block) => block.startIndex <= currentStepIdx)
                    .map((block) => {
                      const isActiveBlock = block.blockId === activeBlockId;
                      const hasOp = !!block.opStep;
                      const showOp =
                        hasOp &&
                        block.opIndex !== null &&
                        currentStepIdx >= block.opIndex;
                      const showShiftedState =
                        !!block.postState &&
                        currentStepIdx >= block.endIndex;
                      const showPost = hasOp && showShiftedState;
                      const preEval = getEvalCtxFromState(block.preState);
                      const postEval =
                        block.postState && !block.isFinal
                          ? getEvalCtxFromState(block.postState)
                          : null;
                      const blockOvr =
                        showOp || (showShiftedState && !hasOp)
                          ? block.postState?.ovr ?? block.opStep?.ovr ?? "0"
                          : "0";
                      const opIsNegative = block.opStep?.opType === "-M";
                      const showShiftLabel =
                        !block.isFinal && (showOp || !block.opStep);
                      const showRUpdate =
                        showShiftedState && block.postState.R !== block.preState.R;

                      return (
                        <tr
                          key={block.id}
                          className={[
                            "border-b border-slate-100 dark:border-slate-800 transition-colors align-top",
                            block.isFinal && showPost
                              ? "table-band-rose"
                              : currentStep?.type === "op" && isActiveBlock
                                ? "table-band-sky"
                                : isActiveBlock
                                  ? "table-band-amber"
                                  : "",
                          ].join(" ")}
                        >
                          <td className="radix3-count-cell py-3 px-3 text-center text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 align-top font-mono text-[16px]">
                            {block.count}
                          </td>

                          <td className="py-3 px-3 text-center border-r border-slate-200 dark:border-slate-700 align-top">
                            <div className="font-mono text-[18px] font-bold text-slate-900 dark:text-slate-100">
                              {blockOvr}
                            </div>
                            {showOp && (
                              <TinyLine color={opIsNegative ? "text-rose-600 dark:text-rose-300" : "text-sky-600 dark:text-sky-300"}>
                                {getDisplayedOpText(block.opStep.opType)}
                              </TinyLine>
                            )}
                          </td>

                          <td className="py-3 px-4 border-r border-slate-200 dark:border-slate-700 align-top">
                            {hasOp ? (
                              <div className="radix3-block-stack grid w-full gap-y-1.5 justify-items-center">
                                <MainSlot>
                                  {renderBits(block.preState.A, { highlightMsb: true })}
                                </MainSlot>

                                <MainSlot>
                                  {showOp && (
                                    <div className="flex items-center justify-center gap-2 border-b-2 border-slate-400 pb-1">
                                      <span
                                        className={[
                                          "font-mono text-[14px]",
                                          opIsNegative
                                            ? "text-rose-600 dark:text-rose-300"
                                            : "text-sky-600 dark:text-sky-300",
                                        ].join(" ")}
                                      >
                                        {opIsNegative ? "-" : "+"}
                                      </span>
                                      {renderBits(block.opStep.A_operand, {
                                        highlightMsb: true,
                                        color: opIsNegative
                                          ? "text-rose-700 dark:text-rose-200"
                                          : "text-sky-700 dark:text-sky-200",
                                      })}
                                    </div>
                                  )}
                                </MainSlot>

                                <MainSlot>
                                  {showOp && (
                                    <div className="flex justify-center">
                                      {renderBits(block.opStep.A_sum, {
                                        highlightMsb: true,
                                        color: "table-text-sky font-semibold",
                                      })}
                                    </div>
                                  )}
                                </MainSlot>

                                <MainSlot>
                                  {showPost &&
                                    renderBits(block.postState.A, {
                                      highlightMsb: true,
                                      color: block.isFinal
                                        ? "text-emerald-700 dark:text-emerald-200 font-semibold"
                                        : "text-slate-800 dark:text-slate-100",
                                    })}
                                </MainSlot>
                              </div>
                            ) : (
                              <div className="radix3-block-stack grid w-full gap-y-1.5 justify-items-center">
                                <MainSlot>
                                  {renderBits(block.preState.A, { highlightMsb: true })}
                                </MainSlot>

                                <MainSlot />
                                <MainSlot />

                                <MainSlot>
                                  {showShiftedState &&
                                    renderBits(block.postState.A, {
                                      highlightMsb: true,
                                      color: block.isFinal
                                        ? "text-emerald-700 dark:text-emerald-200 font-semibold"
                                        : "text-slate-800 dark:text-slate-100",
                                    })}
                                </MainSlot>
                              </div>
                            )}
                          </td>

                          <td className="table-band-emerald py-3 px-2 text-center border-r border-slate-200 dark:border-slate-700 align-top">
                            {hasOp ? (
                              <div className="radix3-block-stack grid w-full gap-y-1.5 justify-items-center">
                                <MainSlot>
                                  <div className="font-mono text-[18px] font-bold table-text-emerald">
                                    {block.preState.Q_extra}
                                  </div>
                                </MainSlot>

                                <MainSlot />
                                <MainSlot />

                                <MainSlot>
                                  {showPost && (
                                    <div className="font-mono text-[18px] font-bold table-text-emerald">
                                      {block.postState.Q_extra}
                                    </div>
                                  )}
                                </MainSlot>
                              </div>
                            ) : (
                              <div className="radix3-block-stack grid w-full gap-y-1.5 justify-items-center">
                                <MainSlot>
                                  <div className="font-mono text-[18px] font-bold table-text-emerald">
                                    {block.preState.Q_extra}
                                  </div>
                                </MainSlot>

                                <MainSlot />
                                <MainSlot />

                                <MainSlot>
                                  {showShiftedState && (
                                    <div className="font-mono text-[18px] font-bold table-text-emerald">
                                      {block.postState.Q_extra}
                                    </div>
                                  )}
                                </MainSlot>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 border-r border-slate-200 dark:border-slate-700 align-top">
                            {hasOp ? (
                              <div className="radix3-block-stack grid w-full gap-y-1.5 justify-items-center">
                                <MainSlot>
                                  {renderBits(block.preState.Q, {
                                    highlightMsb: true,
                                    qGroup: true,
                                    highlightIndices: preEval
                                      ? [block.preState.Q.length - 2, block.preState.Q.length - 1]
                                      : [],
                                  })}
                                </MainSlot>

                                <MainSlot />
                                <MainSlot />

                                <MainSlot>
                                  {showPost &&
                                    renderBits(block.postState.Q, {
                                      highlightMsb: true,
                                      qGroup: true,
                                      highlightIndices: postEval
                                        ? [block.postState.Q.length - 2, block.postState.Q.length - 1]
                                        : [],
                                      bitClassMap: {
                                        0: "text-emerald-700 dark:text-emerald-200 font-semibold",
                                      },
                                      color: block.isFinal
                                        ? "text-emerald-700 dark:text-emerald-200 font-semibold"
                                        : "text-slate-800 dark:text-slate-100",
                                    })}
                                </MainSlot>

                                <NoteSlot>
                                  {showPost && (
                                    <TinyLine color="text-emerald-700 dark:text-emerald-300">
                                      old Q[{bitSize}] enters MSB
                                    </TinyLine>
                                  )}
                                </NoteSlot>
                              </div>
                            ) : (
                              <div className="radix3-block-stack grid w-full gap-y-1.5 justify-items-center">
                                <MainSlot>
                                  {renderBits(block.preState.Q, {
                                    highlightMsb: true,
                                    qGroup: true,
                                    highlightIndices: preEval
                                      ? [block.preState.Q.length - 2, block.preState.Q.length - 1]
                                      : [],
                                  })}
                                </MainSlot>

                                <MainSlot />
                                <MainSlot />

                                <MainSlot>
                                  {showShiftedState &&
                                    renderBits(block.postState.Q, {
                                      highlightMsb: true,
                                      qGroup: true,
                                      highlightIndices: postEval
                                        ? [block.postState.Q.length - 2, block.postState.Q.length - 1]
                                        : [],
                                      bitClassMap: {
                                        0: "text-emerald-700 dark:text-emerald-200 font-semibold",
                                      },
                                      color: block.isFinal
                                        ? "text-emerald-700 dark:text-emerald-200 font-semibold"
                                        : "text-slate-800 dark:text-slate-100",
                                    })}
                                </MainSlot>

                                <NoteSlot>
                                  {showShiftedState && (
                                    <TinyLine color="text-emerald-700 dark:text-emerald-300">
                                      old Q[{bitSize}] enters MSB
                                    </TinyLine>
                                  )}
                                </NoteSlot>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3 text-center border-r border-slate-200 dark:border-slate-700 align-top">
                            {hasOp ? (
                              <div className="radix3-block-stack grid w-full gap-y-1.5 justify-items-center">
                                <MainSlot>
                                  <div className="radix3-r-pill inline-flex h-7 w-7 items-center justify-center rounded-full border border-violet-400/70 bg-violet-50 font-mono text-[18px] font-bold text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">
                                    {block.preState.R}
                                  </div>
                                </MainSlot>

                                <MainSlot />

                                <MainSlot>
                                  {showOp && (
                                    <TinyLine color={block.opStep.R_after === block.preState.R ? "text-slate-500 dark:text-slate-400" : "text-violet-600 dark:text-violet-300"}>
                                      {"R* = " + block.opStep.R_after}
                                    </TinyLine>
                                  )}
                                </MainSlot>

                                <MainSlot>
                                  {showPost && (
                                    <div
                                      className={[
                                        "radix3-r-pill inline-flex h-7 w-7 items-center justify-center rounded-full border font-mono text-[18px] font-bold",
                                        block.isFinal
                                          ? "border-emerald-400/70 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200"
                                          : "border-violet-400/70 bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200",
                                      ].join(" ")}
                                    >
                                      {block.postState.R}
                                    </div>
                                  )}
                                </MainSlot>
                              </div>
                            ) : (
                              <div className="radix3-block-stack grid w-full gap-y-1.5 justify-items-center">
                                <MainSlot>
                                  <div
                                    className="radix3-r-pill inline-flex h-7 w-7 items-center justify-center rounded-full border border-violet-400/70 bg-violet-50 font-mono text-[18px] font-bold text-violet-700 dark:bg-violet-500/10 dark:text-violet-200"
                                  >
                                    {block.preState.R}
                                  </div>
                                </MainSlot>

                                <MainSlot />

                                <MainSlot>
                                  {showShiftedState && (
                                    <TinyLine color={block.postState.R === block.preState.R ? "text-slate-500 dark:text-slate-400" : "text-violet-600 dark:text-violet-300"}>
                                      {"R* = " + block.postState.R}
                                    </TinyLine>
                                  )}
                                </MainSlot>

                                <MainSlot>
                                  {showShiftedState && (
                                    <div
                                      className={[
                                        "radix3-r-pill inline-flex h-7 w-7 items-center justify-center rounded-full border font-mono text-[18px] font-bold",
                                        block.isFinal
                                          ? "border-emerald-400/70 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200"
                                          : "border-violet-400/70 bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200",
                                      ].join(" ")}
                                    >
                                      {block.postState.R}
                                    </div>
                                  )}
                                </MainSlot>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center align-top">
                            <div className="radix3-m-stack flex flex-col items-center gap-1.5">
                              {block.blockId === 0 && (
                                <div className="radix3-m-register-lines">
                                  <TinyLine color="text-slate-600 dark:text-slate-300">
                                    {"M = " + mC2}
                                  </TinyLine>
                                  <TinyLine color="text-slate-600 dark:text-slate-300">
                                    {"-M = " + mNegC2}
                                  </TinyLine>
                                </div>
                              )}

                              {showOp ? (
                                <div
                                  className={[
                                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                    opIsNegative ? "status-chip-negative" : "status-chip-positive",
                                  ].join(" ")}
                                >
                                  {getDisplayedOpText(block.opStep.opType)}
                                </div>
                              ) : (
                                <TinyLine color="text-slate-400 dark:text-slate-500">
                                  0
                                </TinyLine>
                              )}

                              {showShiftLabel && (
                                <TinyLine color="text-violet-600 dark:text-violet-300">
                                  RSHIFT
                                </TinyLine>
                              )}

                              {showRUpdate && (
                                <TinyLine color="text-red-500 dark:text-red-300">
                                  {"R = " + block.postState.R}
                                </TinyLine>
                              )}

                              {block.isFinal && showPost && (
                                <TinyLine color="text-orange-600 dark:text-orange-300">
                                  done
                                </TinyLine>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {currentEvalCtx && (
              <div className="radix3-eval-strip mt-4 flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-950/50">
                <span className="font-semibold text-slate-700 dark:text-slate-200">Evaluating:</span>

                <span className="context-chip font-mono rounded px-2 py-1">
                  x₍i+1₎={currentEvalCtx.x_i1}
                </span>

                <span className="context-chip font-mono rounded px-2 py-1">
                  xᵢ={currentEvalCtx.x_i}
                </span>

                <span className="context-chip font-mono rounded px-2 py-1">
                  R={currentEvalCtx.prevR}
                </span>

                <span className="text-slate-400">→</span>

                <span
                  className={`font-mono px-2 py-1 rounded ${currentEvalCtx.op === 1
                    ? "status-chip-positive"
                    : currentEvalCtx.op === -1
                      ? "status-chip-negative"
                      : "status-chip-neutral"
                    }`}
                >
                  OP=
                  {currentEvalCtx.op === 0
                    ? "0"
                    : currentEvalCtx.op === 1
                      ? "+1"
                      : "-1"}
                </span>

                <span className="font-mono rounded px-2 py-1 table-band-amber table-text-amber">
                  R*={currentEvalCtx.R_star}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Practice panel */}
      {isPracticeMode && currentStepIdx < steps.length - 1 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-950/92">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <StepForward className="h-5 w-5 text-slate-700 dark:text-slate-200" />
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Your Turn</h3>
            </div>

            {feedback && (
              <div
                className={`mb-3 flex items-center gap-2 rounded p-2 text-sm ${feedback.type === "success"
                  ? "feedback-success"
                  : "feedback-error"
                   }`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                {feedback.msg}
              </div>
            )}

            {practicePhase === "action" && currentEvalCtx && (
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-sm text-slate-600">
                  x₍i+1₎={currentEvalCtx.x_i1}, xᵢ={currentEvalCtx.x_i}, R=
                  {currentEvalCtx.prevR}
                </span>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleActionGuess("add")}
                    className="choice-button-positive rounded-lg border-2 px-4 py-2 font-medium text-sm"
                  >
                    A + M
                  </button>

                  <button
                    onClick={() => handleActionGuess("sub")}
                    className="choice-button-negative rounded-lg border-2 px-4 py-2 font-medium text-sm"
                  >
                    A - M
                  </button>

                  <button
                    onClick={() => handleActionGuess("shift")}
                    className="rounded-lg border-2 border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-950"
                  >
                    0 (shift only)
                  </button>
                </div>
              </div>
            )}

            {practicePhase === "evaluate" && (
              <div className="flex items-end gap-3 flex-wrap">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    OVR
                  </label>
                  <input
                    type="text"
                    maxLength={1}
                    value={userInputs.ovr}
                    onChange={(e) =>
                      setUserInputs({
                        ...userInputs,
                        ovr: e.target.value.replace(/[^01]/g, ""),
                      })
                    }
                    className="w-10 rounded-lg border border-slate-300 px-2 py-2 text-center font-mono dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    A (after shift)
                  </label>
                  <input
                    type="text"
                    maxLength={bitSize}
                    value={userInputs.A}
                    onChange={(e) =>
                      setUserInputs({
                        ...userInputs,
                        A: e.target.value.replace(/[^01]/g, ""),
                      })
                    }
                    className="w-32 rounded-lg border border-slate-300 px-2 py-2 text-center font-mono tracking-wider dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Q[{bitSize}]
                  </label>
                  <input
                    type="text"
                    maxLength={1}
                    value={userInputs.Q_extra}
                    onChange={(e) =>
                      setUserInputs({
                        ...userInputs,
                        Q_extra: e.target.value.replace(/[^01]/g, ""),
                      })
                    }
                    className="w-10 rounded-lg border border-slate-300 px-2 py-2 text-center font-mono dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Q (after shift)
                  </label>
                  <input
                    type="text"
                    maxLength={bitSize}
                    value={userInputs.Q}
                    onChange={(e) =>
                      setUserInputs({
                        ...userInputs,
                        Q: e.target.value.replace(/[^01]/g, ""),
                      })
                    }
                    className="w-32 rounded-lg border border-slate-300 px-2 py-2 text-center font-mono tracking-wider dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    R*
                  </label>
                  <input
                    type="text"
                    maxLength={1}
                    value={userInputs.R}
                    onChange={(e) =>
                      setUserInputs({
                        ...userInputs,
                        R: e.target.value.replace(/[^01]/g, ""),
                      })
                    }
                    className="w-10 rounded-lg border border-slate-300 px-2 py-2 text-center font-mono dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>

                <button
                  onClick={handleValueSubmit}
                  className={primaryButtonClass}
                >
                  Check
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
