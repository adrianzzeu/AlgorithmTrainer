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

const chooseMultipleOfThreeRadix8Bits = (qVal, mVal) => {
    const qNeed = Math.max(
        requiredBitsForSignedInt(qVal),
        requiredBitsForSignedInt(-qVal)
    );

    const mNeed = Math.max(
        requiredBitsForSignedInt(mVal),
        requiredBitsForSignedInt(-mVal)
    );

    const extNeed = Math.max(
        2,
        requiredBitsForSignedInt(mVal),
        requiredBitsForSignedInt(-mVal),
        requiredBitsForSignedInt(2 * mVal),
        requiredBitsForSignedInt(-2 * mVal),
        requiredBitsForSignedInt(3 * mVal),
        requiredBitsForSignedInt(-3 * mVal),
        requiredBitsForSignedInt(4 * mVal),
        requiredBitsForSignedInt(-4 * mVal)
    );

    let bits = Math.max(3, qNeed, mNeed, extNeed - 2);

    if (bits % 3 !== 0) bits += 3 - (bits % 3);

    return bits;
};

const RADIX8_OPS = {
    "0000": { opType: 0, text: "0", actionKey: "shift" },
    "0001": { opType: 1, text: "+M", actionKey: "add_m" },
    "0010": { opType: 1, text: "+M", actionKey: "add_m" },
    "0011": { opType: 2, text: "+2M", actionKey: "add_2m" },
    "0100": { opType: 2, text: "+2M", actionKey: "add_2m" },
    "0101": { opType: 3, text: "+3M", actionKey: "add_3m" },
    "0110": { opType: 3, text: "+3M", actionKey: "add_3m" },
    "0111": { opType: 4, text: "+4M", actionKey: "add_4m" },
    "1000": { opType: -4, text: "-4M", actionKey: "sub_4m" },
    "1001": { opType: -3, text: "-3M", actionKey: "sub_3m" },
    "1010": { opType: -3, text: "-3M", actionKey: "sub_3m" },
    "1011": { opType: -2, text: "-2M", actionKey: "sub_2m" },
    "1100": { opType: -2, text: "-2M", actionKey: "sub_2m" },
    "1101": { opType: -1, text: "-M", actionKey: "sub_m" },
    "1110": { opType: -1, text: "-M", actionKey: "sub_m" },
    "1111": { opType: 0, text: "0", actionKey: "shift" },
};

const getRadix8Op = (b3, b2, b1, b0) => {
    const key = `${b3}${b2}${b1}${b0}`;
    return RADIX8_OPS[key] ?? RADIX8_OPS["0000"];
};

const generateRadix8Steps = (Q_bin, M_bin, bits) => {
    const steps = [];
    const extBits = bits + 2;
    const iterations = bits / 3;
    const lastDisplayedCount = Math.max(0, iterations - 1);

    let A = "0".repeat(extBits);
    let Q = Q_bin;
    let Q_ED = "0";

    const mVal = c2ToInt(M_bin);

    const M = intToC2(mVal, extBits);
    const negM = intToC2(-mVal, extBits);
    const M2 = intToC2(2 * mVal, extBits);
    const negM2 = intToC2(-2 * mVal, extBits);
    const M3 = intToC2(3 * mVal, extBits);
    const negM3 = intToC2(-3 * mVal, extBits);
    const M4 = intToC2(4 * mVal, extBits);
    const negM4 = intToC2(-4 * mVal, extBits);

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
        const b3 = Q[bits - 3];
        const b2 = Q[bits - 2];
        const b1 = Q[bits - 1];
        const b0 = Q_ED;

        const opInfo = getRadix8Op(b3, b2, b1, b0);
        const evalCtx = {
            b3,
            b2,
            b1,
            b0,
            ...opInfo,
        };

        steps[steps.length - 1].evalCtx = evalCtx;

        let operand = null;

        if (opInfo.opType === 1) operand = M;
        if (opInfo.opType === -1) operand = negM;
        if (opInfo.opType === 2) operand = M2;
        if (opInfo.opType === -2) operand = negM2;
        if (opInfo.opType === 3) operand = M3;
        if (opInfo.opType === -3) operand = negM3;
        if (opInfo.opType === 4) operand = M4;
        if (opInfo.opType === -4) operand = negM4;

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
        const shifted = combined[0].repeat(3) + combined.slice(0, combined.length - 3);

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
            evalCtx: null,
        });
    }

    return {
        steps,
        M,
        negM,
        M2,
        negM2,
        M3,
        negM3,
        M4,
        negM4,
        extBits,
        iterations,
    };
};

export default function Radix8BoothApp() {
    const [mode, setMode] = useState("integer");

    // Integer mode
    const [xInt, setXInt] = useState(-10); // multiplier Q
    const [yInt, setYInt] = useState(6);   // multiplicand M

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

    const isFractional = mode === "fractional";

    const derived = useMemo(() => {
        let bitSize;
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

            bitSize = chooseMultipleOfThreeRadix8Bits(qScaled, mScaled);
            extBits = bitSize + 2;

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
                "Radix-8 fixed-point mode. Width is auto-selected, rounded to a multiple of 3, and extended for +/-4M.";
        } else {
            bitSize = chooseMultipleOfThreeRadix8Bits(xInt, yInt);
            extBits = bitSize + 2;

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
                "Radix-8 needs a width that is a multiple of 3. The app chooses it automatically and keeps room for +/-4M on A.";
        }

        const mVal = c2ToInt(mC2);

        return {
            bitSize,
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
            m3Ext: intToC2(3 * mVal, extBits),
            negM3Ext: intToC2(-3 * mVal, extBits),
            m4Ext: intToC2(4 * mVal, extBits),
            negM4Ext: intToC2(-4 * mVal, extBits),
        };
    }, [isFractional, xInt, yInt, qNum, qDen, mNum, mDen]);

    const {
        bitSize,
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
        m3Ext,
        negM3Ext,
        m4Ext,
        negM4Ext,
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
        () => generateRadix8Steps(qC2, mC2, bitSize).steps,
        [qC2, mC2, bitSize]
    );

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

    const renderBits = (bitStr, highlightMsb = false, highlightTailCount = 0) => {
        if (!bitStr) return null;

        return (
            <span className="font-mono tracking-wider">
                {bitStr.split("").map((b, i) => {
                    const isHighlightedTail = highlightTailCount > 0 && i >= bitStr.length - highlightTailCount;

                    return (
                        <span
                            key={`${bitStr}-${i}`}
                            className={`inline-block w-4 text-center ${i === 0 && highlightMsb ? "text-slate-700 dark:text-slate-200 font-bold" : ""
                                } ${isHighlightedTail ? "border-b-2 border-red-400 font-semibold" : ""
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

        // Drop the two guard bits from A, keep Q whole
        const productBin = finalStep.A.substring(2) + finalStep.Q;
        const raw = c2ToInt(productBin);

        const base = {
            binary: productBin,
            raw,
            A: finalStep.A,
            Q: finalStep.Q,
            Q_ED: finalStep.Q_ED,
            display: `${finalStep.A.substring(2)}.${finalStep.Q}`,
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
                msg: "Correct! Now compute the registers after the arithmetic right shift by 3.",
            });

            setPracticePhase("evaluate");

            if (currentStepIdx < steps.length - 1) {
                setCurrentStepIdx((prev) => prev + 1);
            }
        } else {
            setFeedback({
                type: "error",
                msg: "Incorrect. Use the Radix-8 truth table on Q[2], Q[1], Q[0], Q[-1].",
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
                msg: "Incorrect. Remember: apply the operation first, then arithmetic right shift the combined register by 3.",
            });
        }
    };

    const truthTableRows = [
        ["0000", "0"],
        ["0001", "+M"],
        ["0010", "+M"],
        ["0011", "+2M"],
        ["0100", "+2M"],
        ["0101", "+3M"],
        ["0110", "+3M"],
        ["0111", "+4M"],
        ["1000", "-4M"],
        ["1001", "-3M"],
        ["1010", "-3M"],
        ["1011", "-2M"],
        ["1100", "-2M"],
        ["1101", "-M"],
        ["1110", "-M"],
        ["1111", "0"],
    ];

    const radix8Pseudo = `1. Choose a width N that is a multiple of 3.
2. Convert operands to C2 on N bits.
3. Init:
   A = 0...(N+2 bits)
   Q = multiplier (N bits)
   Q[-1] = 0

4. Precompute on N+2 bits:
   M, -M, 2M, -2M, 3M, -3M, 4M, -4M

5. Repeat N/3 times:
   read (Q[2], Q[1], Q[0], Q[-1])

   0000 or 1111 -> 0
   0001 or 0010 -> +M
   0011 or 0100 -> +2M
   0101 or 0110 -> +3M
   0111         -> +4M
   1000         -> -4M
   1001 or 1010 -> -3M
   1011 or 1100 -> -2M
   1101 or 1110 -> -M

   A = A + selected_operand

   Arithmetic Right Shift by 3
   on the combined register:
   [ A | Q | Q[-1] ]

6. Final product:
   P = A[N-1:0] · Q[N-1:0]`;

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
                            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-200">Radix-8 Booth</h1>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                Multiple-of-3 width and practice
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

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                        Register Width
                                    </label>
                                    <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
                                        {bitSize} bits (auto, multiple of 3)
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

                            <div className="grid grid-cols-3 gap-3">
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
                                        Register Width
                                    </label>
                                    <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
                                        {bitSize} bits (auto, multiple of 3)
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

                            <div className="font-mono text-slate-600 dark:text-slate-400 flex justify-between">
                                <span>3M</span>
                                <span>{m3Ext}</span>
                            </div>

                            <div className="font-mono text-slate-600 dark:text-slate-400 flex justify-between">
                                <span>-3M</span>
                                <span>{negM3Ext}</span>
                            </div>

                            <div className="font-mono text-slate-600 dark:text-slate-400 flex justify-between">
                                <span>4M</span>
                                <span>{m4Ext}</span>
                            </div>

                            <div className="font-mono text-slate-600 dark:text-slate-400 flex justify-between">
                                <span>-4M</span>
                                <span>{negM4Ext}</span>
                            </div>
                        </div>

                        <div className="text-amber-700">{note}</div>

                        {finalProduct && currentStepIdx === steps.length - 1 && (
                            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {mode === "fractional"
                                        ? `Product = ${finalProduct.fractionText} ~ ${finalProduct.decimal.toFixed(
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

                                <div className="text-xs mt-1 text-slate-600 dark:text-slate-400">
                                    Expected ~{" "}
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
                                SM {"->"} C2 Conversions
                            </div>
                            <HoverInfo title="Why this is shown">
                                <div className="space-y-2">
                                    <div>
                                        The algorithm works on <span className="font-semibold">C2</span>.
                                    </div>
                                    <div>
                                        For negatives:
                                        <span className="font-mono block mt-1">
                                            full-width |x| {"->"} invert {"->"} +1 {"->"} C2
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
                            Radix-8 Truth Table
                        </button>

                        {showTruthTable && (
                            <div className="truth-table-surface rounded-[1.25rem] p-2 overflow-x-auto">
                                <table className="w-full text-xs text-center font-mono">
                                    <thead>
                                        <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                            <th className="py-1 px-1">Q[2]</th>
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
                                                `${currentEvalCtx.b3}${currentEvalCtx.b2}${currentEvalCtx.b1}${currentEvalCtx.b0}` ===
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
                                                    <td className="py-1">{row[0][3]}</td>
                                                    <td
                                                        className={`py-1 ${row[1] === "+M" || row[1] === "+2M" || row[1] === "+3M" || row[1] === "+4M"
                                                                ? "text-slate-900 dark:text-slate-100"
                                                                : row[1] === "-M" || row[1] === "-2M" || row[1] === "-3M" || row[1] === "-4M"
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
                                        ARS by 3 on [A | Q | Q[-1]]
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
                                <HoverInfo title="Radix-8 Booth pseudo-code" align="right">
                                    <pre className="whitespace-pre-wrap font-mono text-xs leading-5 text-slate-700 dark:text-slate-300">
                                        {radix8Pseudo}
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
                                    {steps.slice(0, currentStepIdx + 1).map((step, idx) => {
                                        const isActive = idx === currentStepIdx;
                                        const showEvalHighlight =
                                            !!step.evalCtx &&
                                            step.type === "state" &&
                                            !step.isMathResult &&
                                            !step.isFinal;

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
                                                            {renderBits(step.Q, true, showEvalHighlight ? 3 : 0)}
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
                                                                ARS by 3 {"->"}
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
                                                        &darr;
                                                    </td>

                                                    <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-700 text-center text-slate-300 dark:text-slate-600 font-bold">
                                                        &darr;
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
                                    Q[2]={currentEvalCtx.b3}
                                </span>

                                <span className="context-chip font-mono rounded px-2 py-1">
                                    Q[1]={currentEvalCtx.b2}
                                </span>

                                <span className="context-chip font-mono rounded px-2 py-1">
                                    Q[0]={currentEvalCtx.b1}
                                </span>

                                <span className="context-chip font-mono rounded px-2 py-1">
                                    Q[-1]={currentEvalCtx.b0}
                                </span>

                                <span className="text-slate-400">-&gt;</span>

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
                                    Q[2]={currentEvalCtx.b3}, Q[1]={currentEvalCtx.b2}, Q[0]={currentEvalCtx.b1}, Q[-1]={currentEvalCtx.b0}
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
                                        onClick={() => handleActionGuess("add_3m")}
                                        className="choice-button-positive rounded-lg border-2 px-4 py-2 font-medium text-sm"
                                    >
                                        +3M
                                    </button>

                                    <button
                                        onClick={() => handleActionGuess("add_4m")}
                                        className="choice-button-positive rounded-lg border-2 px-4 py-2 font-medium text-sm"
                                    >
                                        +4M
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
                                        onClick={() => handleActionGuess("sub_3m")}
                                        className="choice-button-negative rounded-lg border-2 px-4 py-2 font-medium text-sm"
                                    >
                                        -3M
                                    </button>

                                    <button
                                        onClick={() => handleActionGuess("sub_4m")}
                                        className="choice-button-negative rounded-lg border-2 px-4 py-2 font-medium text-sm"
                                    >
                                        -4M
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




