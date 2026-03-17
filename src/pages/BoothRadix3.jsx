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

const getBoothOperation = (x_i1, x_i, R) => {
  const b1 = Number(x_i1);
  const b0 = Number(x_i);
  const r = Number(R);

  if (b1 === 0 && b0 === 0 && r === 0) return { op: 0, R_star: "0" };
  if (b1 === 0 && b0 === 1 && r === 0) return { op: 1, R_star: "0" };
  if (b1 === 1 && b0 === 0 && r === 0) return { op: 0, R_star: "0" };
  if (b1 === 1 && b0 === 1 && r === 0) return { op: -1, R_star: "1" };

  if (b1 === 0 && b0 === 0 && r === 1) return { op: 1, R_star: "0" };
  if (b1 === 0 && b0 === 1 && r === 1) return { op: 0, R_star: "1" };
  if (b1 === 1 && b0 === 0 && r === 1) return { op: -1, R_star: "1" };
  if (b1 === 1 && b0 === 1 && r === 1) return { op: 0, R_star: "1" };

  return { op: 0, R_star: "0" };
};

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

    const currentStepCount = getCountStr(i, lastDisplayedCount);
    const displayCount = (i === 0) ? "" : currentStepCount;

    if (op !== 0) {
      const operand = op === 1 ? M : M_neg;
      const addRes = addBinaryStr(A, operand);

      A_sum = addRes.result;
      ovr = getOvr(A, operand, A_sum);

      steps.push({
        id: `op_${i}`,
        type: "op",
        blockId: i,
        count: displayCount,
        ovr,
        A_before: A,
        A_operand: operand,
        A_sum,
        opType: op === 1 ? "+M" : "-M",
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
      count: (op !== 0) ? "" : displayCount,
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

  const isFractional = mode === "fractional";

  const derived = useMemo(() => {
    let bitSize;
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

      bitSize = Math.max(
        2,
        requiredBitsForSignedInt(qScaled),
        requiredBitsForSignedInt(-qScaled),
        requiredBitsForSignedInt(mScaled),
        requiredBitsForSignedInt(-mScaled)
      );

      const qData = getFractionalData(qNum, qDen, fracBits, bitSize);
      const mData = getFractionalData(mNum, mDen, fracBits, bitSize);

      qC2 = qData.c2;
      mC2 = mData.c2;
      qSM = qData.sm;
      mSM = mData.sm;
      mNegC2 = intToC2(-mData.scaledNum, bitSize);

      expectedProduct = (qNum / Math.max(1, qDen)) * (mNum / Math.max(1, mDen));
      note = "Fractional mode uses fixed-point scaling. Best with denominators that are powers of 2.";

      qBinaryValue = qData.scaledNum;
      mBinaryValue = mData.scaledNum;
      qRegisterLabel = `register value = ${qData.scaledNum} = ${qData.scaledNum}/2^${fracBits}`;
      mRegisterLabel = `register value = ${mData.scaledNum} = ${mData.scaledNum}/2^${fracBits}`;
    } else {
      bitSize = Math.max(
        2,
        requiredBitsForSignedInt(xInt),
        requiredBitsForSignedInt(-xInt),
        requiredBitsForSignedInt(yInt),
        requiredBitsForSignedInt(-yInt)
      );

      qC2 = intToC2(xInt, bitSize);
      mC2 = intToC2(yInt, bitSize);
      qSM = intToSM(xInt, bitSize);
      mSM = intToSM(yInt, bitSize);
      mNegC2 = intToC2(-yInt, bitSize);

      expectedProduct = xInt * yInt;
      note = "Bit width is chosen automatically from the operands.";

      qBinaryValue = xInt;
      mBinaryValue = yInt;
      qRegisterLabel = `register value = ${xInt}`;
      mRegisterLabel = `register value = ${yInt}`;
    }

    return {
      bitSize,
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
  }, [isFractional, xInt, yInt, qNum, qDen, mNum, mDen]);

  const {
    bitSize,
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
      color = "text-blue-700",
    } = {}
  ) => {
    if (!bitStr) return null;

    return (
      <span className={`inline-flex items-center font-mono text-[17px] leading-5 ${color}`}>
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
                i === 0 && highlightMsb ? "text-blue-600 dark:text-blue-400 font-bold" : "",
                emphasizeLast && i === bitStr.length - 1 ? "underline underline-offset-2" : "",
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
    <div className={`text-[11px] leading-4 mt-1 ${color} ${mono ? "font-mono" : ""}`}>
      {children}
    </div>
  );

  const ArrowHint = ({ from, to, color = "text-violet-600" }) => (
    <div className={`text-[11px] leading-4 mt-1 font-mono ${color}`}>
      {`${from} -> ${to}`}
    </div>
  );



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

  const getCurrentEvalCtx = () => {
    const step = steps[currentStepIdx];

    if (step?.evalCtx) return step.evalCtx;
    if (currentStepIdx + 1 < steps.length && steps[currentStepIdx + 1]?.evalCtx) {
      return steps[currentStepIdx + 1].evalCtx;
    }

    return null;
  };

  const currentEvalCtx = getCurrentEvalCtx();

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

  const tableRows = [
    [0, 0, 0, "0", 0],
    [0, 1, 0, "+1", 0],
    [1, 0, 0, "0", 0],
    [1, 1, 0, "-1", 1],
    [0, 0, 1, "+1", 0],
    [0, 1, 1, "0", 1],
    [1, 0, 1, "-1", 1],
    [1, 1, 1, "0", 1],
  ];

  const algorithmPseudo = `1. Choose bit width automatically.
2. Convert operands to C2.
3. Init:
   A = 0...0
   Q = multiplier
   Q[bits] = sign(Q)
   R = 0
   M = multiplicand
   -M = C2(-multiplicand)

4. For i = 0 .. bits-1:
   read (x_{i+1}, x_i, R)
   (OP, R*) = truthTable(x_{i+1}, x_i, R)

   if OP = +1: A_sum = A + M
   if OP = -1: A_sum = A + (-M)
   if OP =  0: A_sum = A

   OVR = signedOverflow(A, operand, A_sum)

   arithmetic right shift:
   new A[MSB] = A_sum[MSB] XOR OVR
   new A[bits-2:0] = A_sum[bits-1:1]
   new Q[bits] = A_sum[LSB]
   new Q = old Q[bits] · old Q[bits-1:1]
   R = R*

5. Final product:
   P = A[bits-1:0] · Q[bits:1]`;

  return (
    <div className="booth-page min-h-screen">
      <div className="workbench-shell flex flex-col xl:flex-row">
        {/* Sidebar */}
        <div className="workbench-sidebar w-full xl:w-96 p-5 shadow-lg xl:min-h-[calc(100vh-7rem)]">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <GraduationCap className="text-blue-600 dark:text-blue-400 w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 dark:text-slate-200">Modified Booth</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Integer + fractional fixed-point
              </p>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-lg bg-slate-100 dark:bg-slate-700 p-1 mb-5">
            <button
              onClick={() => handleModeChange("integer")}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${mode === "integer"
                ? "bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 dark:hover:text-slate-200"
                }`}
            >
              Integer
            </button>

            <button
              onClick={() => handleModeChange("fractional")}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${mode === "fractional"
                ? "bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 dark:hover:text-slate-200"
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
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Bit Width
                </label>
                <div className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                  {bitSize} bits (auto)
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
                    className="w-full px-2 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
                    className="w-full px-2 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
                    className="w-full px-2 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
                    className="w-full px-2 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Fractional Bits
                  </label>
                  <div className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                    {fracBits} bits (auto)
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Total Register Bits
                  </label>
                  <div className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                    {bitSize} bits (auto)
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
                <span className="text-blue-600 dark:text-blue-400 font-semibold">{qC2}</span>
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
                <span className="text-blue-600 dark:text-blue-400 font-semibold">{mC2}</span>
              </div>

              <div className="font-mono text-red-600 dark:text-red-400 flex justify-between mt-1 pt-1 border-t border-slate-200 dark:border-slate-700">
                <span>-M:</span>
                <span className="font-semibold">{mNegC2}</span>
              </div>
            </div>

            <div className="text-amber-700 dark:text-amber-400">{note}</div>

            {finalProduct && currentStepIdx === steps.length - 1 && (
              <div className="pt-1">
                <div className="font-semibold text-green-700 dark:text-green-400 text-sm">
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
              className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 hover:text-blue-600 dark:text-blue-400"
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
                              ? "text-green-600 dark:text-green-400"
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
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <span className="text-sm font-medium text-slate-700">
                Practice Mode
              </span>
              <button
                onClick={() => setIsPracticeMode(!isPracticeMode)}
                className={`w-11 h-6 rounded-full transition-colors relative ${isPracticeMode ? "bg-green-500" : "bg-slate-300"
                  }`}
              >
                <div
                  className={`w-4 h-4 bg-white dark:bg-slate-800 rounded-full absolute top-1 transition-transform shadow-sm ${isPracticeMode ? "translate-x-6" : "translate-x-1"
                    }`}
                />
              </button>
            </div>

            {!isPracticeMode && (
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={jumpToStart}
                  className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
                  title="Reset"
                >
                  <RotateCcw className="w-4 h-4 mx-auto" />
                </button>

                <button
                  onClick={prevStep}
                  disabled={currentStepIdx === 0}
                  className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-lg text-slate-600 dark:text-slate-400 disabled:opacity-40 transition-colors"
                  title="Previous"
                >
                  <ChevronRight className="w-4 h-4 mx-auto rotate-180" />
                </button>

                <button
                  onClick={nextStep}
                  disabled={currentStepIdx === steps.length - 1}
                  className="p-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-500 rounded-lg text-white disabled:opacity-40 transition-colors"
                  title="Next"
                >
                  <ChevronRight className="w-4 h-4 mx-auto" />
                </button>

                <button
                  onClick={runAll}
                  disabled={currentStepIdx === steps.length - 1}
                  className="p-2 bg-green-500 hover:bg-green-600 rounded-lg text-white disabled:opacity-40 transition-colors"
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
            <div className="summary-banner mb-4 flex items-center justify-between gap-4 flex-wrap rounded-[1.4rem] p-4 text-sm text-blue-800">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <span className="font-semibold">Shift Formula:</span>
                  <code className="ml-2 rounded bg-blue-100 px-2 py-0.5 dark:bg-cyan-950/60 dark:text-cyan-100">
                    A[MSB] = Sum[MSB] ⊕ OVR
                  </code>
                </div>

                <div>
                  <span className="font-semibold">Result:</span>
                  <code className="ml-2 rounded bg-blue-100 px-2 py-0.5 dark:bg-cyan-950/60 dark:text-cyan-100">
                    A[{bitSize - 1}:0].Q[{bitSize}:1]
                  </code>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Pseudo-code</span>
                <HoverInfo title="Modified Booth pseudo-code" align="right">
                  <pre className="whitespace-pre-wrap font-mono text-xs leading-5 text-slate-700">
                    {algorithmPseudo}
                  </pre>
                </HoverInfo>
              </div>
            </div>

            <div className="step-table-surface rounded-[1.5rem] overflow-hidden">
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
                  {steps.slice(0, currentStepIdx + 1).map((step, idx) => {
                    const isActive = idx === currentStepIdx;

                    if (step.type === "state") {
                      const meta = step.shiftMeta;
                      const showShiftNotes = !step.isInit && !!meta;

                      return (
                        <tr
                          key={step.id}
                          className={`
                            border-b transition-colors
                            ${step.isRedBox ? "table-band-rose border-2 border-red-400 dark:border-red-500/70" : ""}
                            ${isActive && !step.isRedBox ? "table-band-amber" : ""}
                            ${!step.isInit && !step.isRedBox ? "border-b-2 border-slate-300" : "border-slate-100 dark:border-slate-800"}
                          `}
                        >
                          <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 align-top font-mono text-[16px]">
                            {step.count}
                          </td>

                          <td className="py-3 px-3 text-center border-r border-slate-200 dark:border-slate-700 align-top">
                            <div className="font-mono text-[18px] font-bold text-slate-900 dark:text-slate-100">{step.ovr}</div>
                            {showShiftNotes && <TinyLine color="text-indigo-600">OVR={meta.ovr}</TinyLine>}
                          </td>

                          <td className="py-3 px-4 border-r border-slate-200 dark:border-slate-700 align-top">
                            <div className="flex flex-col items-center">
                              <div className="flex justify-center">
                                {renderBits(step.A, { highlightMsb: true })}
                              </div>

                              {showShiftNotes && (
                                <>
                                  <ArrowHint
                                    from={`${meta.sumMsb} ⊕ ${meta.ovr}`}
                                    to={meta.correctedMsb}
                                    color="text-violet-600"
                                  />
                                  <TinyLine>A[MSB] = Sum[MSB] ⊕ OVR</TinyLine>
                                </>
                              )}
                            </div>
                          </td>

                          <td className="table-band-emerald py-3 px-2 text-center border-r border-slate-200 dark:border-slate-700 align-top">
                            <div className="font-mono text-[18px] font-bold table-text-emerald">{step.Q_extra}</div>
                            {showShiftNotes && (
                              <>
                                <ArrowHint from={meta.aLsb} to={`Q[${bitSize}]`} color="text-green-600 dark:text-green-400" />
                                <TinyLine>A₀ shifts here</TinyLine>
                              </>
                            )}
                          </td>

                          <td className="py-3 px-4 border-r border-slate-200 dark:border-slate-700 align-top">
                            <div className="flex flex-col items-center">
                              <div className="flex justify-center">
                                {renderBits(step.Q, { highlightMsb: true, qGroup: true })}
                              </div>

                              {showShiftNotes && (
                                <>
                                  <ArrowHint from={meta.oldQExtra} to="MSB" color="text-blue-600 dark:text-blue-400" />
                                  <TinyLine>old Q[bits] enters Q</TinyLine>
                                </>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-3 text-center border-r border-slate-200 dark:border-slate-700 align-top">
                            <div className="font-mono text-[18px] font-bold text-red-600 dark:text-red-400">{step.R}</div>
                            {showShiftNotes && (
                              <>
                                <ArrowHint from={meta.prevR} to={meta.nextR} color="text-red-500" />
                                <TinyLine>R becomes R*</TinyLine>
                              </>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center align-top">
                            {step.isInit && renderBits(step.M, { highlightMsb: true, qGroup: true, color: "text-slate-800" })}
                            {!step.isInit && meta && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                                op: {meta.opText}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    }

                    if (step.type === "op") {
                      return (
                        <tr
                          key={step.id}
                          className={`border-b border-slate-100 dark:border-slate-800 ${isActive ? "table-band-sky" : "table-band-slate"}`}
                        >
                          <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 align-top font-mono text-[16px]">
                            {step.count}
                          </td>

                          <td className="py-3 px-3 text-center border-r border-slate-200 dark:border-slate-700 align-top">
                            <div className="text-[13px] font-bold text-blue-600 dark:text-blue-400">op</div>
                            <TinyLine color="text-indigo-600">OVR={step.ovr}</TinyLine>
                          </td>

                          <td className="py-3 px-4 border-r border-slate-200 dark:border-slate-700 align-top">
                            <div className="flex flex-col items-center">
                              <div className="flex justify-center border-b-2 border-slate-400 pb-1">
                                {renderBits(step.A_operand, { highlightMsb: true })}
                              </div>

                              <div className="mt-2 font-mono text-[13px] text-slate-500">
                                {step.A_before} + operand
                              </div>

                              <div className="font-mono text-[15px] table-text-sky font-semibold">
                                = {step.A_sum}
                              </div>
                            </div>
                          </td>

                          <td className="table-band-emerald py-3 px-2 border-r border-slate-200 dark:border-slate-700"></td>
                          <td className="py-3 px-4 border-r border-slate-200 dark:border-slate-700"></td>
                          <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700"></td>

                          <td className="py-3 px-4 text-center text-slate-700 dark:text-slate-300 font-semibold align-top">
                            {step.opType}
                          </td>
                        </tr>
                      );
                    }

                    return null;
                  })}
                </tbody>
              </table>
            </div>

            {currentEvalCtx && currentStepIdx > 0 && (
              <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-sm flex items-center gap-4 flex-wrap">
                <span className="font-semibold text-slate-700">Evaluating:</span>

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
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-lg p-4 z-50">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <StepForward className="w-5 h-5 text-green-600 dark:text-green-400" />
              <h3 className="font-bold text-slate-800">Your Turn</h3>
            </div>

            {feedback && (
              <div
                className={`p-2 rounded mb-3 flex items-center gap-2 text-sm ${feedback.type === "success"
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
                    +M
                  </button>

                  <button
                    onClick={() => handleActionGuess("sub")}
                    className="choice-button-negative rounded-lg border-2 px-4 py-2 font-medium text-sm"
                  >
                    -M
                  </button>

                  <button
                    onClick={() => handleActionGuess("shift")}
                    className="px-4 py-2 border-2 border-slate-400 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900 rounded-lg font-medium text-sm"
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
                    className="w-10 px-2 py-2 font-mono border border-slate-300 rounded-lg text-center"
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
                    className="w-32 px-2 py-2 font-mono border border-slate-300 rounded-lg text-center tracking-wider"
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
                    className="w-10 px-2 py-2 font-mono border border-slate-300 rounded-lg text-center"
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
                    className="w-32 px-2 py-2 font-mono border border-slate-300 rounded-lg text-center tracking-wider"
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
                    className="w-10 px-2 py-2 font-mono border border-slate-300 rounded-lg text-center"
                  />
                </div>

                <button
                  onClick={handleValueSubmit}
                  className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg"
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
