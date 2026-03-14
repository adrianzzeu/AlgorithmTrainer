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

const chooseEvenRadix4Bits = (qVal, mVal) => {
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
        requiredBitsForSignedInt(-2 * mVal)
    );

    let bits = Math.max(2, qNeed, mNeed, extNeed - 1);

    if (bits % 2 !== 0) bits++;

    return bits;
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
    const iterations = bits / 2;
    const lastDisplayedCount = Math.max(0, iterations - 1);

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
        const b2 = Q[bits - 2];
        const b1 = Q[bits - 1];
        const b0 = Q_ED;

        const opInfo = getRadix4Op(b2, b1, b0);
        const evalCtx = {
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

        if (operand) {
            steps.push({
                id: `op_${i}`,
                type: "op",
                operand,
                opText: opInfo.text,
                evalCtx,
            });

            A = addBinaryStr(A, operand).result;

            steps.push({
                id: `math_${i}`,
                type: "state",
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

        steps.push({
            id: `arrow_${i}`,
            type: "arrow",
            evalCtx,
        });

        const combined = A + Q + Q_ED;
        const shifted = combined[0].repeat(2) + combined.slice(0, combined.length - 2);

        A = shifted.slice(0, extBits);
        Q = shifted.slice(extBits, extBits + bits);
        Q_ED = shifted.slice(-1);

        const isFinal = i === iterations - 1;

        steps.push({
            id: `shift_${i}`,
            type: "state",
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
        extBits,
        iterations,
    };
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

            bitSize = chooseEvenRadix4Bits(qScaled, mScaled);
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
                "Radix-4 fixed-point mode. Best when denominators are powers of 2. Width is auto-selected and rounded to an even number.";
        } else {
            bitSize = chooseEvenRadix4Bits(xInt, yInt);
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
                "Radix-4 needs an even width. The app chooses the width automatically and keeps room for ±2M on A.";
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

    const renderBits = (bitStr, highlightMsb = false, underlineLastTwo = false) => {
        if (!bitStr) return null;

        return (
            <span className="font-mono tracking-wider">
                {bitStr.split("").map((b, i) => {
                    const isLastTwo = i >= bitStr.length - 2;

                    return (
                        <span
                            key={`${bitStr}-${i}`}
                            className={`inline-block w-4 text-center ${i === 0 && highlightMsb ? "text-blue-600 dark:text-blue-400 font-bold" : ""
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
                msg: "Correct! Now compute the registers after the arithmetic right shift by 2.",
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
                msg: "Incorrect. Remember: apply the operation first, then arithmetic right shift the combined register by 2.",
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

    const radix4Pseudo = `1. Choose an even width N automatically.
2. Convert operands to C2 on N bits.
3. Init:
   A = 0...(N+1 bits)
   Q = multiplier (N bits)
   Q[-1] = 0

4. Precompute on N+1 bits:
   M, -M, 2M, -2M

5. Repeat N/2 times:
   read (Q[1], Q[0], Q[-1])

   000 or 111 -> 0
   001 or 010 -> +M
   011        -> +2M
   100        -> -2M
   101 or 110 -> -M

   A = A + selected_operand

   Arithmetic Right Shift by 2
   on the combined register:
   [ A | Q | Q[-1] ]

6. Final product:
   P = A[N-1:0] · Q[N-1:0]`;

    return (
        <div className="booth-page min-h-screen">
            <div className="workbench-shell flex flex-col xl:flex-row">
                {/* Sidebar */}
                <div className="workbench-sidebar w-full xl:w-[26rem] p-5 shadow-lg xl:min-h-[calc(100vh-7rem)]">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <GraduationCap className="text-blue-600 dark:text-blue-400 w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-200">Radix-4 Booth</h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Auto width + practice + conversions
                            </p>
                        </div>
                    </div>

                    {/* Mode toggle */}
                    <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 mb-5">
                        <button
                            onClick={() => handleModeChange("integer")}
                            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${mode === "integer"
                                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200"
                                }`}
                        >
                            Integer
                        </button>

                        <button
                            onClick={() => handleModeChange("fractional")}
                            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${mode === "fractional"
                                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200"
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
                                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                        Register Width
                                    </label>
                                    <div className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                                        {bitSize} bits (auto, even)
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                        A / M Variant Width
                                    </label>
                                    <div className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300">
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
                                        className="w-full px-2 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
                                        className="w-full px-2 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
                                        className="w-full px-2 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
                                        className="w-full px-2 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                        Fractional Bits
                                    </label>
                                    <div className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                                        {fracBits} bits
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                        Register Width
                                    </label>
                                    <div className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                                        {bitSize} bits (auto, even)
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                        A / M Variant Width
                                    </label>
                                    <div className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300">
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
                                <span className="text-blue-600 dark:text-blue-400 font-semibold">{qC2}</span>
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
                                <span className="text-blue-600 dark:text-blue-400 font-semibold">{mC2}</span>
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
                                <div className="font-semibold text-green-700 text-sm">
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
                            className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 hover:text-blue-600 dark:text-blue-400"
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
                                                                ? "text-green-600"
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
                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Practice Mode</span>
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
                                    className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
                                    title="Reset"
                                >
                                    <RotateCcw className="w-4 h-4 mx-auto" />
                                </button>

                                <button
                                    onClick={prevStep}
                                    disabled={currentStepIdx === 0}
                                    className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg text-slate-600 dark:text-slate-400 disabled:opacity-40 transition-colors"
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
                    <div className="max-w-6xl mx-auto">
                        <div className="summary-banner mb-4 flex items-center justify-between gap-4 flex-wrap rounded-[1.4rem] p-4 text-sm text-blue-800">
                            <div className="flex items-center gap-4 flex-wrap">
                                <div>
                                    <span className="font-semibold">Shift:</span>
                                    <code className="ml-2 rounded bg-blue-100 px-2 py-0.5 dark:bg-cyan-950/60 dark:text-cyan-100">
                                        ARS by 2 on [A | Q | Q[-1]]
                                    </code>
                                </div>

                                <div>
                                    <span className="font-semibold">Result:</span>
                                    <code className="ml-2 rounded bg-blue-100 px-2 py-0.5 dark:bg-cyan-950/60 dark:text-cyan-100">
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
                            ${!step.isMathResult && !step.isFinal
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

                                                    <td className="py-2 px-4 border-r border-slate-200 dark:border-slate-700">
                                                        <div className="flex justify-center border-b-2 border-slate-400 pb-1">
                                                            {renderBits(step.operand, true)}
                                                        </div>
                                                    </td>

                                                    <td className="py-2 px-4 border-r border-slate-200 dark:border-slate-700 text-center text-slate-400 dark:text-slate-500">
                                                        —
                                                    </td>

                                                    <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-700 text-center text-slate-400 dark:text-slate-500">
                                                        —
                                                    </td>

                                                    <td className="py-2 px-4 text-center font-semibold text-slate-700 dark:text-slate-300">
                                                        {step.opText}
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        if (step.type === "arrow") {
                                            return (
                                                <tr
                                                    key={step.id}
                                                    className={`border-b border-slate-100 dark:border-slate-800 ${isActive ? "table-band-violet" : ""
                                                        }`}
                                                >
                                                    <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-700"></td>
                                                    <td className="py-2 px-4 border-r border-slate-200 dark:border-slate-700 text-center table-text-violet font-semibold">
                                                        ARS by 2
                                                    </td>
                                                    <td className="py-2 px-4 border-r border-slate-200 dark:border-slate-700 text-center table-text-violet font-semibold">
                                                        ↓↓
                                                    </td>
                                                    <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-700 text-center table-text-violet font-semibold">
                                                        ↓
                                                    </td>
                                                    <td className="py-2 px-4 text-center table-text-violet font-semibold">
                                                        shift
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
                            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-sm flex items-center gap-4 flex-wrap">
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
                <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-lg p-4 z-50">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex items-center gap-3 mb-3">
                            <StepForward className="w-5 h-5 text-green-600" />
                            <h3 className="font-bold text-slate-800 dark:text-slate-200">Your Turn</h3>
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
                                        className="w-40 px-2 py-2 font-mono border border-slate-300 rounded-lg text-center tracking-wider"
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
                                        className="w-36 px-2 py-2 font-mono border border-slate-300 rounded-lg text-center tracking-wider"
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
                                        className="w-14 px-2 py-2 font-mono border border-slate-300 rounded-lg text-center"
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
