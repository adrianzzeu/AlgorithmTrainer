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

const normalizeRadix4Bits = (bits) => Math.max(2, bits);

const getRadix4BaseBitNeed = (qVal, mVal) => {
    const qNeed = Math.max(2, requiredBitsForSignedInt(qVal));
    const mNeed = Math.max(2, requiredBitsForSignedInt(mVal));

    const extNeed = Math.max(
        2,
        requiredBitsForSignedInt(mVal),
        requiredBitsForSignedInt(-mVal),
        requiredBitsForSignedInt(2 * mVal),
        requiredBitsForSignedInt(-2 * mVal)
    );

    return Math.max(2, qNeed, mNeed, extNeed - 1);
};

const isExactC2Width = (value, bits) => {
    const encoded = intToC2(value, bits);
    return encoded.length === bits && c2ToInt(encoded) === value;
};

const getRadix4WindowBits = (qBin, iteration) => {
    const bits = qBin.length;
    const signBit = qBin[0];
    const bitAt = (indexFromLsb) => {
        if (indexFromLsb < 0) return "0";
        if (indexFromLsb >= bits) return signBit;
        return qBin[bits - 1 - indexFromLsb];
    };

    return {
        b2: bitAt(iteration * 2 + 1),
        b1: bitAt(iteration * 2),
        b0: bitAt(iteration * 2 - 1),
    };
};

const getRadix4Op = (b2, b1, b0) => {
    const key = `${b2}${b1}${b0}`;

    if (key === "000" || key === "111") {
        return { opType: 0, text: "0", actionKey: "shift" };
    }
    if (key === "001" || key === "010") {
        return { opType: 1, text: "+M", actionKey: "add_m" };
    }
    if (key === "011") {
        return { opType: 2, text: "+2M", actionKey: "add_2m" };
    }
    if (key === "100") {
        return { opType: -2, text: "-2M", actionKey: "sub_2m" };
    }
    if (key === "101" || key === "110") {
        return { opType: -1, text: "-M", actionKey: "sub_m" };
    }

    return { opType: 0, text: "0", actionKey: "shift" };
};

const generateRadix4Steps = (Q_bin, M_bin, bits) => {
    const steps = [];
    const extBits = bits + 1;
    const iterations = Math.ceil(bits / 2);
    const lastDisplayedCount = Math.max(0, iterations - 1);
    const originalQ = Q_bin;

    let A = "0".repeat(extBits);
    let Q = Q_bin;
    let Q_ED = "0";

    const mVal = c2ToInt(M_bin);

    const M = intToC2(mVal, extBits);
    const negM = intToC2(-mVal, extBits);
    const M2 = intToC2(2 * mVal, extBits);
    const negM2 = intToC2(-2 * mVal, extBits);

    steps.push({
        id: "init",
        type: "state",
        blockId: 0,
        count: getCountStr(0, lastDisplayedCount),
        A,
        Q,
        Q_ED,
        isInit: true,
        isMathResult: false,
        isFinal: false,
        evalCtx: null,
    });

    for (let i = 0; i < iterations; i++) {
        const { b2, b1, b0 } = getRadix4WindowBits(originalQ, i);
        const shiftAmount = Math.min(2, bits - i * 2);

        const opInfo = getRadix4Op(b2, b1, b0);
        const evalCtx = {
            b2,
            b1,
            b0,
            shiftAmount,
            ...opInfo,
        };

        steps[steps.length - 1].evalCtx = evalCtx;

        let operand = null;

        if (opInfo.opType === 1) operand = M;
        if (opInfo.opType === -1) operand = negM;
        if (opInfo.opType === 2) operand = M2;
        if (opInfo.opType === -2) operand = negM2;

        if (operand) {
            steps.push({
                id: `op_${i}`,
                type: "op",
                blockId: i,
                operand,
                opText: opInfo.text,
                evalCtx,
            });

            A = addBinaryStr(A, operand).result;

            steps.push({
                id: `math_${i}`,
                type: "state",
                blockId: i,
                count: "",
                A,
                Q,
                Q_ED,
                isInit: false,
                isMathResult: true,
                isFinal: false,
                evalCtx,
            });
        }

        const combined = A + Q + Q_ED;
        const shifted =
            combined[0].repeat(shiftAmount) + combined.slice(0, combined.length - shiftAmount);

        A = shifted.slice(0, extBits);
        Q = shifted.slice(extBits, extBits + bits);
        Q_ED = shifted.slice(-1);

        const isFinal = i === iterations - 1;

        steps.push({
            id: `shift_${i}`,
            type: "state",
            blockId: i,
            count: isFinal ? "" : getCountStr(i + 1, lastDisplayedCount),
            A,
            Q,
            Q_ED,
            isInit: false,
            isMathResult: false,
            isFinal,
            shiftAmount,
            evalCtx: null,
        });
    }

    return {
        steps,
        M,
        negM,
        M2,
        negM2,
        extBits,
        iterations,
    };
};

const getRadix4FinalProductBinary = (Q_bin, M_bin, bits) => {
    const { steps } = generateRadix4Steps(Q_bin, M_bin, bits);
    const finalStep = steps[steps.length - 1];

    if (!finalStep || finalStep.type !== "state") return null;

    return finalStep.A.substring(1) + finalStep.Q;
};

const doesRadix4WidthWork = (qVal, mVal, bits) => {
    if (bits < 2) return false;

    const extBits = bits + 1;
    const scaledOperands = [mVal, -mVal, 2 * mVal, -2 * mVal];

    if (!isExactC2Width(qVal, bits) || !isExactC2Width(mVal, bits)) {
        return false;
    }

    if (scaledOperands.some((value) => !isExactC2Width(value, extBits))) {
        return false;
    }

    const qBin = intToC2(qVal, bits);
    const mBin = intToC2(mVal, bits);
    const finalProductBin = getRadix4FinalProductBinary(qBin, mBin, bits);

    return finalProductBin != null && c2ToInt(finalProductBin) === qVal * mVal;
};

const chooseRadix4Bits = (qVal, mVal) => {
    const minCandidate = normalizeRadix4Bits(getRadix4BaseBitNeed(qVal, mVal));

    for (let candidate = minCandidate, attempts = 0; attempts < 16; candidate += 1, attempts++) {
        if (doesRadix4WidthWork(qVal, mVal, candidate)) {
            return candidate;
        }
    }

    return minCandidate;
};

export default function Radix4BoothApp() {
    const [mode, setMode] = useState("integer");

    // Integer mode
    const [xInt, setXInt] = useState(-105); // multiplier Q
    const [yInt, setYInt] = useState(-79);  // multiplicand M

    // Fractional mode
    const [qNum, setQNum] = useState(-101);
    const [qDen, setQDen] = useState(128);
    const [mNum, setMNum] = useState(-44);
    const [mDen, setMDen] = useState(64);

    const [currentStepIdx, setCurrentStepIdx] = useState(0);
    const [showTruthTable, setShowTruthTable] = useState(true);

    const [isPracticeMode, setIsPracticeMode] = useState(false);
    const [practicePhase, setPracticePhase] = useState("action");
    const [userInputs, setUserInputs] = useState({
        A: "",
        Q: "",
        Q_ED: "",
    });
    const [feedback, setFeedback] = useState(null);
    const [bitWidthMode, setBitWidthMode] = useState("auto");
    const [manualBitSize, setManualBitSize] = useState(8);

    const isFractional = mode === "fractional";

    const derived = useMemo(() => {
        let bitSize;
        let autoBitSize;
        let extBits;
        let fracBits = 0;

        let qC2;
        let mC2;
        let qSM;
        let mSM;

        let qBinaryValue;
        let mBinaryValue;
        let qRegisterLabel;
        let mRegisterLabel;
        let expectedProduct;
        let note = "";

        if (isFractional) {
            fracBits = Math.max(
                1,
                Math.ceil(Math.log2(Math.max(1, qDen))),
                Math.ceil(Math.log2(Math.max(1, mDen)))
            );

            const qScaled = scaleFractionToFixedInt(qNum, qDen, fracBits);
            const mScaled = scaleFractionToFixedInt(mNum, mDen, fracBits);

            autoBitSize = chooseRadix4Bits(qScaled, mScaled);
            bitSize = bitWidthMode === "manual"
                ? normalizeRadix4Bits(Math.max(autoBitSize, manualBitSize))
                : autoBitSize;
            extBits = bitSize + 1;

            const qData = getFractionalData(qNum, qDen, fracBits, bitSize);
            const mData = getFractionalData(mNum, mDen, fracBits, bitSize);

            qC2 = qData.c2;
            mC2 = mData.c2;
            qSM = qData.sm;
            mSM = mData.sm;

            qBinaryValue = qData.scaledNum;
            mBinaryValue = mData.scaledNum;

            qRegisterLabel = `register value = ${qData.scaledNum} = ${qData.scaledNum}/2^${fracBits}`;
            mRegisterLabel = `register value = ${mData.scaledNum} = ${mData.scaledNum}/2^${fracBits}`;

            expectedProduct = (qNum / Math.max(1, qDen)) * (mNum / Math.max(1, mDen));
            note =
                bitWidthMode === "manual"
                    ? `Radix-4 fixed-point mode. Width locked to ${bitSize} bits (auto minimum ${autoBitSize}).`
                    : `Radix-4 fixed-point mode. Width = ${bitSize} bits (minimum working width).`;
        } else {
            autoBitSize = chooseRadix4Bits(xInt, yInt);
            bitSize = bitWidthMode === "manual"
                ? normalizeRadix4Bits(Math.max(autoBitSize, manualBitSize))
                : autoBitSize;
            extBits = bitSize + 1;

            qC2 = intToC2(xInt, bitSize);
            mC2 = intToC2(yInt, bitSize);
            qSM = intToSM(xInt, bitSize);
            mSM = intToSM(yInt, bitSize);

            qBinaryValue = xInt;
            mBinaryValue = yInt;

            qRegisterLabel = `register value = ${xInt}`;
            mRegisterLabel = `register value = ${yInt}`;

            expectedProduct = xInt * yInt;
            note =
                "Radix-4 auto width picks the minimum working size and leaves room for +/-2M on A.";
        }

        if (!isFractional) {
            note =
                bitWidthMode === "manual"
                    ? `Radix-4 width locked to ${bitSize} bits (auto minimum ${autoBitSize}).`
                    : "Radix-4 auto width picks the minimum working size and leaves room for +/-2M on A.";
        }

        const mVal = c2ToInt(mC2);

        return {
            bitSize,
            autoBitSize,
            extBits,
            fracBits,
            qC2,
            mC2,
            qSM,
            mSM,
            qBinaryValue,
            mBinaryValue,
            qRegisterLabel,
            mRegisterLabel,
            expectedProduct,
            note,
            mExt: intToC2(mVal, extBits),
            negMExt: intToC2(-mVal, extBits),
            m2Ext: intToC2(2 * mVal, extBits),
            negM2Ext: intToC2(-2 * mVal, extBits),
        };
    }, [isFractional, xInt, yInt, qNum, qDen, mNum, mDen, bitWidthMode, manualBitSize]);

    const {
        bitSize,
        autoBitSize,
        extBits,
        fracBits,
        qC2,
        mC2,
        qSM,
        mSM,
        qBinaryValue,
        mBinaryValue,
        qRegisterLabel,
        mRegisterLabel,
        expectedProduct,
        note,
        mExt,
        negMExt,
        m2Ext,
        negM2Ext,
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
        () => generateRadix4Steps(qC2, mC2, bitSize).steps,
        [qC2, mC2, bitSize]
    );

    const stepIndexById = useMemo(
        () => Object.fromEntries(steps.map((step, index) => [step.id, index])),
        [steps]
    );

    const cycleBlocks = useMemo(() => {
        const blocks = [];
        const iterations = Math.ceil(bitSize / 2);

        for (let i = 0; i < iterations; i++) {
            const startId = i === 0 ? "init" : `shift_${i - 1}`;
            const startIndex = stepIndexById[startId];
            const cycleHasBegun =
                startIndex != null &&
                (i === 0 ? currentStepIdx >= startIndex : currentStepIdx > startIndex);

            if (startIndex == null || !cycleHasBegun) {
                continue;
            }

            const opIndex = stepIndexById[`op_${i}`];
            const mathIndex = stepIndexById[`math_${i}`];
            const shiftIndex = stepIndexById[`shift_${i}`];

            const startState = steps[startIndex];
            const opStep = opIndex != null ? steps[opIndex] : null;
            const mathState = mathIndex != null ? steps[mathIndex] : null;
            const shiftState = shiftIndex != null ? steps[shiftIndex] : null;

            const showOp = opIndex != null && currentStepIdx >= opIndex;
            const showMath = mathIndex != null && currentStepIdx >= mathIndex;
            const showShift = shiftIndex != null && currentStepIdx >= shiftIndex;

            const lastVisibleIndex = showShift
                ? shiftIndex
                : showMath
                    ? mathIndex
                    : showOp
                        ? opIndex
                        : startIndex;

            blocks.push({
                id: `cycle_${i}`,
                iteration: i,
                count: startState.count,
                startState,
                opStep,
                mathState,
                shiftState,
                showOp,
                showMath,
                showShift,
                isActive:
                    currentStepIdx >= startIndex &&
                    currentStepIdx <= lastVisibleIndex,
            });
        }

        return blocks;
    }, [bitSize, currentStepIdx, stepIndexById, steps]);

    const resetPractice = () => {
        setPracticePhase("action");
        setUserInputs({
            A: "",
            Q: "",
            Q_ED: "",
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
        const safeValue = Number.isFinite(parsed) ? parsed : 2;
        setManualBitSize(normalizeRadix4Bits(safeValue));
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

    const renderBits = (bitStr, highlightMsb = false, underlineLastTwo = false) => {
        if (!bitStr) return null;

        return (
            <span className="font-mono tracking-wider">
                {bitStr.split("").map((b, i) => {
                    const isLastTwo = i >= bitStr.length - 2;

                    return (
                        <span
                            key={`${bitStr}-${i}`}
                            className={`inline-block w-4 text-center ${i === 0 && highlightMsb ? "text-slate-700 dark:text-slate-200 font-bold" : ""
                                } ${underlineLastTwo && isLastTwo ? "border-b-2 border-red-400 font-semibold" : ""
                                }`}
                        >
                            {b}
                        </span>
                    );
                })}
            </span>
        );
    };

    const renderCycleQLine = (bitStr, showEvalHighlight) => {
        if (!bitStr) return null;

        return (
            <span className="font-mono tracking-wider">
                {bitStr.split("").map((b, i) => {
                    const isLastTwo = i >= bitStr.length - 2;

                    return (
                        <span
                            key={`${bitStr}-${i}`}
                            className={`inline-block w-4 text-center ${i === 0 ? "text-slate-700 dark:text-slate-200 font-bold" : ""
                                } ${showEvalHighlight && isLastTwo ? "rounded-full border border-cyan-400 text-cyan-600 dark:text-cyan-300 font-semibold" : ""
                                }`}
                        >
                            {b}
                        </span>
                    );
                })}
            </span>
        );
    };

    const getCurrentEvalCtx = () => {
        const step = steps[currentStepIdx];
        if (step?.evalCtx) return step.evalCtx;

        for (let i = currentStepIdx - 1; i >= 0; i--) {
            if (steps[i]?.evalCtx) return steps[i].evalCtx;
        }

        return null;
    };

    const currentEvalCtx = getCurrentEvalCtx();

    const getFinalProduct = () => {
        if (steps.length === 0) return null;

        const finalStep = steps[steps.length - 1];
        if (finalStep.type !== "state") return null;

        // Drop A extra bit, keep Q whole
        const productBin = finalStep.A.substring(1) + finalStep.Q;
        const raw = c2ToInt(productBin);

        const base = {
            binary: productBin,
            raw,
            A: finalStep.A,
            Q: finalStep.Q,
            Q_ED: finalStep.Q_ED,
            display: `${finalStep.A.substring(1)}.${finalStep.Q}`,
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

    const handleActionGuess = (guessedAction) => {
        const ctx = currentEvalCtx;
        if (!ctx) return;

        if (guessedAction === ctx.actionKey) {
            setFeedback({
                type: "success",
                msg: `Correct! Now compute the registers after the arithmetic right shift by ${ctx.shiftAmount}.`,
            });

            setPracticePhase("evaluate");

            if (currentStepIdx < steps.length - 1) {
                setCurrentStepIdx((prev) => prev + 1);
            }
        } else {
            setFeedback({
                type: "error",
                msg: "Incorrect. Use the Radix-4 truth table on Q[1], Q[0], Q[-1].",
            });
        }
    };

    const handleValueSubmit = () => {
        let targetIdx = currentStepIdx + 1;

        while (
            targetIdx < steps.length &&
            !(steps[targetIdx].type === "state" && !steps[targetIdx].isMathResult)
        ) {
            targetIdx++;
        }

        if (targetIdx >= steps.length) return;

        const targetState = steps[targetIdx];

        const isCorrect =
            userInputs.A === targetState.A &&
            userInputs.Q === targetState.Q &&
            userInputs.Q_ED === targetState.Q_ED;

        if (isCorrect) {
            setFeedback({ type: "success", msg: "Excellent! Values match." });
            setCurrentStepIdx(targetIdx);
            setPracticePhase("action");
            setUserInputs({
                A: "",
                Q: "",
                Q_ED: "",
            });
        } else {
            setFeedback({
                type: "error",
                msg: "Incorrect. Remember: apply the operation first, then arithmetic right shift the combined register by the current group size.",
            });
        }
    };

    const truthTableRows = [
        ["000", "0"],
        ["001", "+M"],
        ["010", "+M"],
        ["011", "+2M"],
        ["100", "-2M"],
        ["101", "-M"],
        ["110", "-M"],
        ["111", "0"],
    ];

    const radix4Pseudo = `1. Choose the minimum safe width N.
2. Convert operands to C2 on N bits.
3. Init:
   A = 0...(N+1 bits)
   Q = multiplier (N bits)
   Q[-1] = 0

4. Precompute on N+1 bits:
   M, -M, 2M, -2M

5. Repeat ceil(N/2) times:
   recode the next radix-4 group from the original multiplier bits
   using sign extension at the top and Q[-1] = 0 at the bottom

   000 or 111 -> 0
   001 or 010 -> +M
   011        -> +2M
   100        -> -2M
   101 or 110 -> -M

   A = A + selected_operand

   Arithmetic Right Shift by the current group size
   usually 2, but the last cycle can be 1
   on the combined register:
   [ A | Q | Q[-1] ]

6. Final product:
   P = A[N-1:0] . Q[N-1:0]`;

    return (
        <div className="booth-page min-h-screen">
            <div className="workbench-shell flex flex-col xl:flex-row">
                {/* Sidebar */}
                <div className="workbench-sidebar w-full xl:w-[26rem] p-5 shadow-lg xl:min-h-[calc(100vh-7rem)]">
                    <div className="mb-6 flex items-center gap-3">
                        <div className="rounded-2xl border border-slate-200 bg-white/70 p-2.5 dark:border-slate-700 dark:bg-slate-950/50">
                            <GraduationCap className="h-5 w-5 text-slate-700 dark:text-slate-200" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-200">Radix-4 Booth</h1>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                Auto width and practice
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
                                        X (Multiplier / Q)
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
                                        Y (Multiplicand / M)
                                    </label>
                                    <input
                                        type="number"
                                        value={yInt}
                                        onChange={handleSignedInput(setYInt)}
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
                                            min={autoBitSize}
                                            step={1}
                                            value={manualBitSize}
                                            onChange={handleManualBitSizeChange}
                                            className={inputClass}
                                        />
                                    </div>
                                )}

                                <div className="grid grid-cols-3 gap-3">
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
                                            Register Width
                                        </label>
                                        <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
                                            {bitSize} bits
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                            A / M Variant Width
                                        </label>
                                        <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
                                            {extBits} bits
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
                                            min={autoBitSize}
                                            step={1}
                                            value={manualBitSize}
                                            onChange={handleManualBitSizeChange}
                                            className={inputClass}
                                        />
                                    </div>
                                )}

                                <div className="grid grid-cols-4 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                            Fractional Bits
                                        </label>
                                        <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
                                            {fracBits} bits
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
                                            Register Width
                                        </label>
                                        <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
                                            {bitSize} bits
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                            A / M Variant Width
                                        </label>
                                        <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
                                            {extBits} bits
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Binary summary */}
                    <div className="sidebar-surface rounded-[1.25rem] p-4 mb-5 text-xs space-y-3">
                        <div className="pb-2 border-b border-slate-200 dark:border-slate-700">
                            <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                X = {mode === "integer" ? xInt : `${qNum}/${qDen}`} (Q)
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
                                Y = {mode === "integer" ? yInt : `${mNum}/${mDen}`} (M)
                            </div>

                            <div className="font-mono text-slate-600 dark:text-slate-400 flex justify-between">
                                <span>SM:</span>
                                <span>{mSM}</span>
                            </div>

                            <div className="font-mono text-slate-600 dark:text-slate-400 flex justify-between">
                                <span>C2:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-100">{mC2}</span>
                            </div>
                        </div>

                        <div className="pt-1 border-t border-slate-200 dark:border-slate-700 space-y-1">
                            <div className="font-semibold text-slate-700 dark:text-slate-300">Precomputed on {extBits} bits</div>

                            <div className="font-mono text-slate-600 dark:text-slate-400 flex justify-between">
                                <span>M</span>
                                <span>{mExt}</span>
                            </div>

                            <div className="font-mono text-slate-600 dark:text-slate-400 flex justify-between">
                                <span>-M</span>
                                <span>{negMExt}</span>
                            </div>

                            <div className="font-mono text-slate-600 dark:text-slate-400 flex justify-between">
                                <span>2M</span>
                                <span>{m2Ext}</span>
                            </div>

                            <div className="font-mono text-slate-600 dark:text-slate-400 flex justify-between">
                                <span>-2M</span>
                                <span>{negM2Ext}</span>
                            </div>
                        </div>

                        <div className="text-amber-700">{note}</div>

                        {finalProduct && currentStepIdx === steps.length - 1 && (
                            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {mode === "fractional"
                                        ? `Product = ${finalProduct.fractionText} ≈ ${finalProduct.decimal.toFixed(
                                            6
                                        )}`
                                        : `Product = ${finalProduct.decimal}`}
                                </div>

                                <div className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    A[{bitSize - 1}:0].Q[{bitSize - 1}:0]
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

                                <div className="text-xs mt-1 text-slate-600 dark:text-slate-400">
                                    Expected ≈{" "}
                                    {mode === "fractional"
                                        ? expectedProduct.toFixed(6)
                                        : expectedProduct}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SM -> C2 */}
                    <div className="mb-5">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                SM → C2 Conversions
                            </div>
                            <HoverInfo title="Why this is shown">
                                <div className="space-y-2">
                                    <div>
                                        The algorithm works on <span className="font-semibold">C2</span>.
                                    </div>
                                    <div>
                                        For negatives:
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
                            Radix-4 Truth Table
                        </button>

                        {showTruthTable && (
                            <div className="truth-table-surface rounded-[1.25rem] p-2 overflow-x-auto">
                                <table className="w-full text-xs text-center font-mono">
                                    <thead>
                                        <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                            <th className="py-1 px-1">Q[1]</th>
                                            <th className="py-1 px-1">Q[0]</th>
                                            <th className="py-1 px-1">Q[-1]</th>
                                            <th className="py-1 px-1">OP</th>
                                        </tr>
                                    </thead>

                                    <tbody className="text-slate-700 dark:text-slate-300">
                                        {truthTableRows.map((row, i) => {
                                            const highlighted =
                                                currentEvalCtx &&
                                                `${currentEvalCtx.b2}${currentEvalCtx.b1}${currentEvalCtx.b0}` ===
                                                row[0];

                                            return (
                                                <tr
                                                    key={i}
                                                    className={`border-b border-slate-100 dark:border-slate-800 ${highlighted ? "bg-yellow-100 font-bold" : ""
                                                        }`}
                                                >
                                                    <td className="py-1">{row[0][0]}</td>
                                                    <td className="py-1">{row[0][1]}</td>
                                                    <td className="py-1">{row[0][2]}</td>
                                                    <td
                                                        className={`py-1 ${row[1] === "+M" || row[1] === "+2M"
                                                                ? "text-slate-900 dark:text-slate-100"
                                                                : row[1] === "-M" || row[1] === "-2M"
                                                                    ? "text-red-600"
                                                                    : ""
                                                            }`}
                                                    >
                                                        {row[1]}
                                                    </td>
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
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Practice Mode</span>
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
                    <div className="max-w-6xl mx-auto">
                        <div className="summary-banner mb-4 flex flex-wrap items-center justify-between gap-4 rounded-[1.4rem] p-4 text-sm text-slate-700 dark:text-slate-200">
                            <div className="flex flex-wrap items-center gap-4">
                                <div>
                                    <span className="font-semibold">Shift:</span>
                                    <code className="ml-2 rounded bg-white/80 px-2 py-0.5 dark:bg-slate-950/50 dark:text-slate-100">
                                        ARS by current group size on [A | Q | Q[-1]]
                                    </code>
                                </div>

                                <div>
                                    <span className="font-semibold">Result:</span>
                                    <code className="ml-2 rounded bg-white/80 px-2 py-0.5 dark:bg-slate-950/50 dark:text-slate-100">
                                        A[{bitSize - 1}:0].Q[{bitSize - 1}:0]
                                    </code>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">Pseudo-code</span>
                                <HoverInfo title="Radix-4 Booth pseudo-code" align="right">
                                    <pre className="whitespace-pre-wrap font-mono text-xs leading-5 text-slate-700 dark:text-slate-300">
                                        {radix4Pseudo}
                                    </pre>
                                </HoverInfo>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="step-table-surface rounded-[1.5rem] overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50/90 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                                        <th className="py-3 px-3 text-center font-semibold border-r border-slate-200 dark:border-slate-700">
                                            COUNT
                                        </th>
                                        <th className="py-3 px-4 text-center font-semibold border-r border-slate-200 dark:border-slate-700">
                                            A ({extBits})
                                        </th>
                                        <th className="py-3 px-4 text-center font-semibold border-r border-slate-200 dark:border-slate-700">
                                            Q ({bitSize})
                                        </th>
                                        <th className="py-3 px-3 text-center font-semibold border-r border-slate-200 dark:border-slate-700">
                                            Q[-1]
                                        </th>
                                        <th className="py-3 px-4 text-center font-semibold">
                                            M / Action
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="font-mono">
                                    {cycleBlocks.map((block) => {
                                        const showEvalHighlight = !!block.startState.evalCtx;
                                        const isFinalBlock = !!block.shiftState?.isFinal && block.showShift;
                                        const reserveOpRow = block.showOp || block.showMath || block.showShift;
                                        const reserveMathRow = block.showMath || block.showShift;

                                        return (
                                            <tr
                                                key={block.id}
                                                className={`border-b align-top transition-colors ${isFinalBlock
                                                    ? "table-band-rose border-2 border-red-400 dark:border-red-500/70"
                                                    : block.isActive
                                                        ? "table-band-amber"
                                                        : "table-band-slate border-slate-100 dark:border-slate-800"
                                                    }`}
                                            >
                                                <td className="py-4 px-3 text-center text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 font-semibold">
                                                    {block.count}
                                                </td>

                                                <td className="py-4 px-4 border-r border-slate-200 dark:border-slate-700">
                                                    <div className="grid gap-y-2">
                                                        <div className="min-h-[24px] flex justify-center">
                                                            {renderBits(block.startState.A, true)}
                                                        </div>

                                                        {reserveOpRow && (
                                                            <div className="min-h-[30px] flex items-center justify-center">
                                                                {block.showOp && block.opStep && (
                                                                    <div className="flex items-center justify-center gap-3 text-slate-600 dark:text-slate-300">
                                                                        <span className="w-4 text-right text-[15px] font-bold">
                                                                            +
                                                                        </span>
                                                                        <div className="border-b-2 border-slate-400 pb-1">
                                                                            {renderBits(block.opStep.operand, true)}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {reserveMathRow && (
                                                            <div className="min-h-[24px] flex justify-center">
                                                                {block.showMath && block.mathState && (
                                                                    <div className="text-slate-800 dark:text-slate-100">
                                                                        {renderBits(block.mathState.A, true)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {block.showShift && block.shiftState && (
                                                            <div
                                                                className={`min-h-[24px] flex justify-center ${block.shiftState.isFinal
                                                                    ? "table-text-rose"
                                                                    : "text-sky-700 dark:text-sky-300"
                                                                    }`}
                                                            >
                                                                {renderBits(block.shiftState.A, true)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="py-4 px-4 border-r border-slate-200 dark:border-slate-700">
                                                    <div className="grid gap-y-2">
                                                        <div className="min-h-[24px] flex justify-center">
                                                            {renderCycleQLine(block.startState.Q, showEvalHighlight)}
                                                        </div>

                                                        {reserveOpRow && <div className="min-h-[30px]" />}

                                                        {reserveMathRow && <div className="min-h-[24px]" />}

                                                        {block.showShift && block.shiftState && (
                                                            <div
                                                                className={`min-h-[24px] flex justify-center ${block.shiftState.isFinal
                                                                    ? "table-text-rose"
                                                                    : "text-sky-700 dark:text-sky-300"
                                                                    }`}
                                                            >
                                                                {renderBits(block.shiftState.Q, true)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="py-4 px-3 text-center border-r border-slate-200 dark:border-slate-700 font-bold">
                                                    <div className="grid gap-y-2">
                                                        <div
                                                            className={`min-h-[24px] flex items-center justify-center ${showEvalHighlight
                                                                ? "text-cyan-600 dark:text-cyan-300"
                                                                : "text-slate-700 dark:text-slate-300"}`}
                                                        >
                                                            {block.startState.Q_ED}
                                                        </div>

                                                        {reserveOpRow && <div className="min-h-[30px]" />}

                                                        {reserveMathRow && <div className="min-h-[24px]" />}

                                                        {block.showShift && block.shiftState && (
                                                            <div
                                                                className={`min-h-[24px] flex items-center justify-center ${block.shiftState.isFinal
                                                                    ? "table-text-rose"
                                                                    : "text-sky-700 dark:text-sky-300"}`}
                                                            >
                                                                {block.shiftState.Q_ED}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="py-4 px-4 text-center text-slate-500 dark:text-slate-400">
                                                    <div className="grid gap-y-2">
                                                        <div className="min-h-[24px] flex items-center justify-center">
                                                            {block.iteration === 0 && (
                                                                <div className="space-y-1">
                                                                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                                                        M
                                                                    </div>
                                                                    <div className="flex justify-center">
                                                                        {renderBits(mExt, true)}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {reserveOpRow && (
                                                            <div className="min-h-[30px] flex items-center justify-center">
                                                                {block.showOp && block.opStep && (
                                                                    <div
                                                                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${block.opStep.evalCtx.opType > 0
                                                                            ? "status-chip-positive"
                                                                            : "status-chip-negative"
                                                                            }`}
                                                                    >
                                                                        {block.opStep.opText}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {reserveMathRow && <div className="min-h-[24px]" />}

                                                        {block.showShift && (
                                                            <div className="min-h-[24px] flex items-center justify-center">
                                                                <div className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 whitespace-nowrap">
                                                                    ARS by {block.shiftState.shiftAmount}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {isFinalBlock && (
                                                            <div className="font-semibold table-text-rose">
                                                                Final AQ
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );

                                        if (step.type === "state") {
                                            return (
                                                <tr
                                                    key={step.id}
                                                    className={`
                            border-b transition-colors
                            ${step.isFinal ? "table-band-rose border-2 border-red-400 dark:border-red-500/70" : ""}
                            ${step.isMathResult ? "table-band-sky" : ""}
                            ${isActive && !step.isFinal ? "table-band-amber" : ""}
                            ${!step.isMathResult && !step.isFinal && !step.isInit
                                                            ? "border-t-[3px] border-t-slate-300 dark:border-t-slate-600 border-b border-slate-100 dark:border-slate-800"
                                                            : !step.isMathResult && !step.isFinal
                                                                ? "border-slate-100 dark:border-slate-800"
                                                                : "border-slate-200 dark:border-slate-700"
                                                        }
                          `}
                                                >
                                                    <td className="py-2 px-3 text-center text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                                                        {step.isMathResult ? "" : step.count}
                                                    </td>

                                                    <td className="py-2 px-4 border-r border-slate-200 dark:border-slate-700">
                                                        <div className="flex justify-center">
                                                            {renderBits(step.A, true)}
                                                        </div>
                                                    </td>

                                                    <td className="py-2 px-4 border-r border-slate-200 dark:border-slate-700">
                                                        <div className="flex justify-center">
                                                            {renderBits(step.Q, true, showEvalHighlight)}
                                                        </div>
                                                    </td>

                                                    <td
                                                        className={`py-2 px-3 text-center border-r border-slate-200 dark:border-slate-700 font-bold ${showEvalHighlight
                                                                ? "table-band-rose table-text-rose"
                                                                : "text-slate-700 dark:text-slate-300"
                                                            }`}
                                                    >
                                                        {step.Q_ED}
                                                    </td>

                                                    <td className="py-2 px-4 text-center text-slate-500 dark:text-slate-400">
                                                        {step.isInit && renderBits(mExt, true)}
                                                        {step.isMathResult && <span className="font-semibold text-slate-800 dark:text-slate-100">A after op</span>}
                                                        {step.isFinal && <span className="font-semibold table-text-rose">Final</span>}
                                                        {!step.isInit && !step.isMathResult && !step.isFinal && (
                                                            <span className="font-mono text-[11px] text-violet-600 dark:text-violet-400 whitespace-nowrap font-bold">
                                                                ARS by {step.shiftAmount} {"->"}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        if (step.type === "op") {
                                            return (
                                                <tr
                                                    key={step.id}
                                                    className={`border-b border-slate-100 dark:border-slate-800 ${isActive ? "table-band-sky" : "table-band-slate"
                                                        }`}
                                                >
                                                    <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-700"></td>

                                                    <td className="py-2 px-4 border-r border-slate-200 dark:border-slate-700 relative">
                                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[15px] font-bold text-slate-500 dark:text-slate-400">
                                                            +
                                                        </div>
                                                        <div className="flex justify-center border-b-2 border-slate-400 pb-1">
                                                            {renderBits(step.operand, true)}
                                                        </div>
                                                    </td>

                                                    <td className="py-2 px-4 border-r border-slate-200 dark:border-slate-700 text-center text-slate-300 dark:text-slate-600 font-bold">
                                                        ↓
                                                    </td>

                                                    <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-700 text-center text-slate-300 dark:text-slate-600 font-bold">
                                                        ↓
                                                    </td>

                                                    <td className="py-2 px-4 text-center font-semibold text-slate-700 dark:text-slate-300">
                                                        {step.opText}
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return null;
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Evaluation context */}
                        {currentEvalCtx && currentStepIdx < steps.length - 1 && (
                            <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-950/50">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">Evaluating:</span>

                                <span className="context-chip font-mono rounded px-2 py-1">
                                    Q[1]={currentEvalCtx.b2}
                                </span>

                                <span className="context-chip font-mono rounded px-2 py-1">
                                    Q[0]={currentEvalCtx.b1}
                                </span>

                                <span className="context-chip font-mono rounded px-2 py-1">
                                    Q[-1]={currentEvalCtx.b0}
                                </span>

                                <span className="text-slate-400">→</span>

                                <span
                                    className={`font-mono px-2 py-1 rounded ${currentEvalCtx.opType > 0
                                            ? "status-chip-positive"
                                            : currentEvalCtx.opType < 0
                                                ? "status-chip-negative"
                                                : "status-chip-neutral"
                                        }`}
                                >
                                    OP={currentEvalCtx.text}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Practice panel */}
            {isPracticeMode && currentStepIdx < steps.length - 1 && (
                <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-950/92">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex items-center gap-3 mb-3">
                            <StepForward className="h-5 w-5 text-slate-700 dark:text-slate-200" />
                            <h3 className="font-bold text-slate-800 dark:text-slate-200">Your Turn</h3>
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
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                    Q[1]={currentEvalCtx.b2}, Q[0]={currentEvalCtx.b1}, Q[-1]={currentEvalCtx.b0}
                                </span>

                                <div className="flex gap-2 flex-wrap">
                                    <button
                                        onClick={() => handleActionGuess("add_m")}
                                        className="choice-button-positive rounded-lg border-2 px-4 py-2 font-medium text-sm"
                                    >
                                        +M
                                    </button>

                                    <button
                                        onClick={() => handleActionGuess("add_2m")}
                                        className="choice-button-positive rounded-lg border-2 px-4 py-2 font-medium text-sm"
                                    >
                                        +2M
                                    </button>

                                    <button
                                        onClick={() => handleActionGuess("sub_m")}
                                        className="choice-button-negative rounded-lg border-2 px-4 py-2 font-medium text-sm"
                                    >
                                        -M
                                    </button>

                                    <button
                                        onClick={() => handleActionGuess("sub_2m")}
                                        className="choice-button-negative rounded-lg border-2 px-4 py-2 font-medium text-sm"
                                    >
                                        -2M
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
                                        New A ({extBits})
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={extBits}
                                        value={userInputs.A}
                                        onChange={(e) =>
                                            setUserInputs({
                                                ...userInputs,
                                                A: e.target.value.replace(/[^01]/g, ""),
                                            })
                                        }
                                        className="w-40 rounded-lg border border-slate-300 px-2 py-2 text-center font-mono tracking-wider dark:border-slate-700 dark:bg-slate-900"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                        New Q ({bitSize})
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
                                        className="w-36 rounded-lg border border-slate-300 px-2 py-2 text-center font-mono tracking-wider dark:border-slate-700 dark:bg-slate-900"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                        New Q[-1]
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={1}
                                        value={userInputs.Q_ED}
                                        onChange={(e) =>
                                            setUserInputs({
                                                ...userInputs,
                                                Q_ED: e.target.value.replace(/[^01]/g, ""),
                                            })
                                        }
                                        className="w-14 rounded-lg border border-slate-300 px-2 py-2 text-center font-mono dark:border-slate-700 dark:bg-slate-900"
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
