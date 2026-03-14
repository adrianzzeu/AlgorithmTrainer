import React, { useMemo, useState } from "react";
import Card from '../components/ui/Card';
import Mono from '../components/ui/Mono';
import Step from '../components/ui/Step';
import {
    Calculator,
    Binary,
    BookOpen,
    Sigma,
    ArrowRightLeft,
    AlertTriangle,
    CheckCircle2,
    Lightbulb,
    Hash,
    Divide,
} from "lucide-react";
import {
    addBinaryStr,
    invertBits,
    getTwosComplementStr,
    requiredBitsForSignedInt,
    intToSM,
    intToC2,
    c2ToInt,
    smToInt,
    groupBits,
    isPowerOfTwo,
    scaleFractionToFixedInt,
    formatFraction,
    decodeFixedPoint,
} from '../utils/binaryHelpers';

function classNames(...parts) {
    return parts.filter(Boolean).join(" ");
}

function TheoryPill({ children }) {
    return (
        <span className="inline-flex rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">
            {children}
        </span>
    );
}

function WorkedExampleRow({ step, title, children }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:bg-slate-900 transition px-2 rounded-lg">
            <div className="sm:w-32 shrink-0">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    {step}
                </div>
            </div>
            <div className="sm:flex-1">
                {title ? (
                    <div className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {title}
                    </div>
                ) : null}
                {children}
            </div>
        </div>
    );
}

function FormulaBox({ title, formulas }) {
    return (
        <div className="rounded-2xl border-2 border-indigo-100 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/40 p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sigma className="w-16 h-16" />
            </div>
            <div className="text-indigo-900 dark:text-indigo-300 font-bold mb-3">{title}</div>
            <div className="space-y-2 relative z-10">
                {formulas.map((f, i) => (
                    <div key={i} className="flex gap-3 items-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                        <div className="text-sm font-mono text-indigo-900 dark:text-indigo-300">{f}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function SmC2FixedPointLab() {
    const [mode, setMode] = useState("integer");

    const [intValue, setIntValue] = useState(-105);
    const [intBitsMode, setIntBitsMode] = useState("auto");
    const [intBitsManual, setIntBitsManual] = useState(8);

    const [smInput, setSmInput] = useState("11001001");
    const [c2Input, setC2Input] = useState("10011011");

    const [fracNum, setFracNum] = useState(-101);
    const [fracDen, setFracDen] = useState(128);
    const [fracBitsMode, setFracBitsMode] = useState("auto");
    const [fracBitsManual, setFracBitsManual] = useState(7);
    const [totalBitsMode, setTotalBitsMode] = useState("auto");
    const [totalBitsManual, setTotalBitsManual] = useState(8);
    const [fixedC2Input, setFixedC2Input] = useState("10011011");

    const intAnalysis = useMemo(() => {
        const autoBits = Math.max(
            2,
            requiredBitsForSignedInt(intValue),
            requiredBitsForSignedInt(-intValue)
        );
        const bits = intBitsMode === "auto" ? autoBits : Math.max(autoBits, intBitsManual);
        const rangeMin = -(2 ** (bits - 1));
        const rangeMax = 2 ** (bits - 1) - 1;
        const fits = intValue >= rangeMin && intValue <= rangeMax;

        const sm = intToSM(intValue, bits);
        const positiveFull = Math.abs(intValue).toString(2).padStart(bits, "0");
        const inverted = intValue < 0 ? invertBits(positiveFull) : null;
        const plusOne = intValue < 0 ? addBinaryStr(inverted, "1".padStart(bits, "0")).result : null;
        const c2 = intToC2(intValue, bits);

        return {
            autoBits,
            bits,
            rangeMin,
            rangeMax,
            fits,
            sm,
            positiveFull,
            inverted,
            plusOne,
            c2,
        };
    }, [intValue, intBitsMode, intBitsManual]);

    const smConverter = useMemo(() => {
        const clean = smInput.replace(/[^01]/g, "");
        if (!clean) return null;

        const bits = clean.length;
        const sign = clean[0];
        const magnitude = clean.slice(1);
        const magnitudeDecimal = parseInt(magnitude || "0", 2);
        const decimal = smToInt(clean);
        const positiveFull = Math.abs(decimal).toString(2).padStart(bits, "0");
        const inverted = decimal < 0 ? invertBits(positiveFull) : null;
        const plusOne = decimal < 0 ? addBinaryStr(inverted, "1".padStart(bits, "0")).result : null;
        const c2 = intToC2(decimal, bits);

        return {
            bits,
            sign,
            magnitude,
            magnitudeDecimal,
            decimal,
            positiveFull,
            inverted,
            plusOne,
            c2,
        };
    }, [smInput]);

    const c2Converter = useMemo(() => {
        const clean = c2Input.replace(/[^01]/g, "");
        if (!clean) return null;

        const bits = clean.length;
        const decimal = c2ToInt(clean);
        const sm = intToSM(decimal, bits);
        const negative = clean[0] === "1";
        const backToPositive = negative ? getTwosComplementStr(clean) : null;

        return {
            bits,
            decimal,
            sm,
            negative,
            backToPositive,
        };
    }, [c2Input]);

    const fracAnalysis = useMemo(() => {
        const safeDen = Math.max(1, fracDen);
        const autoFracBits = Math.max(1, Math.ceil(Math.log2(safeDen)));
        const fracBits = fracBitsMode === "auto" ? autoFracBits : Math.max(1, fracBitsManual);

        const scaled = scaleFractionToFixedInt(fracNum, safeDen, fracBits);

        const autoTotalBits = Math.max(
            2,
            requiredBitsForSignedInt(scaled),
            requiredBitsForSignedInt(-scaled)
        );
        const totalBits = totalBitsMode === "auto" ? autoTotalBits : Math.max(autoTotalBits, totalBitsManual);

        const sm = intToSM(scaled, totalBits);
        const c2 = intToC2(scaled, totalBits);
        const decoded = decodeFixedPoint(c2, fracBits);
        const exactDecimal = fracNum / safeDen;
        const error = decoded.decimal - exactDecimal;

        return {
            safeDen,
            autoFracBits,
            fracBits,
            scaled,
            autoTotalBits,
            totalBits,
            sm,
            c2,
            decoded,
            exactDecimal,
            error,
            powerOfTwoDen: isPowerOfTwo(safeDen),
        };
    }, [fracNum, fracDen, fracBitsMode, fracBitsManual, totalBitsMode, totalBitsManual]);

    const fixedConverter = useMemo(() => {
        const clean = fixedC2Input.replace(/[^01]/g, "");
        const fracBits = fracBitsMode === "auto" ? Math.max(1, Math.ceil(Math.log2(Math.max(1, fracDen)))) : Math.max(1, fracBitsManual);
        if (!clean) return null;

        const raw = c2ToInt(clean);
        const denom = 2 ** fracBits;
        return {
            bits: clean.length,
            raw,
            fracBits,
            fraction: formatFraction(raw, denom),
            decimal: raw / denom,
            sm: intToSM(raw, clean.length),
        };
    }, [fixedC2Input, fracBitsMode, fracBitsManual, fracDen]);

    return (
        <div className="learning-lab min-h-screen text-slate-900 dark:text-slate-100">
            <div className="page-frame py-8 md:py-10">
                <div className="page-hero surface-card--hero animate-fade-in-up mb-8 rounded-[2rem] p-6 shadow-sm">
                    <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
                        <div>
                            <div className="mb-3 flex flex-wrap gap-2">
                                <TheoryPill>Sign-Magnitude</TheoryPill>
                                <TheoryPill>Two's Complement</TheoryPill>
                                <TheoryPill>Fixed-Point Fractions</TheoryPill>
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 md:text-4xl">
                                SM / C2 / Fixed-Point Lab
                            </h1>
                            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-400">
                                A study page made to help you understand what has to happen before Booth-style multiplication: how to choose the bit width, how to convert from sign-magnitude to two's complement, and how fractional values are represented with fixed-point scaling.
                            </p>
                            <div className="mt-5 flex flex-wrap gap-3">
                                <button
                                    onClick={() => setMode("integer")}
                                    className={classNames(
                                        "rounded-2xl px-4 py-2 text-sm font-semibold transition",
                                        mode === "integer"
                                            ? "bg-slate-900 text-white"
                                            : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800"
                                    )}
                                >
                                    Integer focus
                                </button>
                                <button
                                    onClick={() => setMode("fractional")}
                                    className={classNames(
                                        "rounded-2xl px-4 py-2 text-sm font-semibold transition",
                                        mode === "fractional"
                                            ? "bg-slate-900 text-white"
                                            : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800"
                                    )}
                                >
                                    Fractional focus
                                </button>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                            <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
                                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Fast rule</div>
                                <div className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                                    Positive numbers look the same in <span className="font-semibold">SM</span> and <span className="font-semibold">C2</span> except that SM splits sign + magnitude explicitly.
                                </div>
                            </div>
                            <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
                                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Negative rule</div>
                                <div className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                                    For C2: write <span className="font-semibold">|x|</span> on the full width, invert every bit, then add <span className="font-semibold">1</span>.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                    <div className="animate-fade-in-up space-y-6">
                        <div className="space-y-6">
                            <Card title="1. Sign-Magnitude (SM)" subtitle="Simple to read, hard for arithmetic" icon={BookOpen}>
                                <div className="space-y-4">
                                    <div className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                                        In <strong>Sign-Magnitude</strong>, the <strong>leftmost bit is ONLY a sign flag</strong>.
                                        It has no numerical value.
                                        <ul className="list-disc list-inside mt-2 space-y-1">
                                            <li><span className="font-mono">0</span> means positive</li>
                                            <li><span className="font-mono">1</span> means negative</li>
                                            <li>The remaining bits are strictly the absolute magnitude</li>
                                        </ul>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-4 border border-slate-100 dark:border-slate-800">
                                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Example: -105 on 8 bits</div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col items-center">
                                                <div className="text-red-600 dark:text-red-500 font-bold font-mono text-lg">1</div>
                                                <div className="text-[10px] text-red-500 uppercase">Sign</div>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <div className="text-slate-800 dark:text-slate-200 font-mono text-lg tracking-widest">1101001</div>
                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Magnitude (105)</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <Card title="2. Two's Complement (C2)" subtitle="What arithmetic hardware actually uses" icon={BookOpen}>
                                <div className="space-y-4">
                                    <div className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                                        In <strong>Two's Complement</strong>, the <strong>leftmost bit is NOT just a sign flag</strong>.
                                        It is a real bit with a <strong>negative numerical weight</strong>.
                                        On <span className="font-mono">N</span> bits, the weight of the MSB is <span className="font-mono">-2^(N-1)</span>. All other bits have normal positive weights.
                                    </div>
                                    
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-4 border border-slate-100 dark:border-slate-800">
                                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Reading C2 by weights</div>
                                            <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">Let's read the 8-bit C2 word <span className="font-mono font-bold text-slate-900 dark:text-slate-100">10011011</span>:</div>
                                            <div className="font-mono text-xs space-y-1 text-slate-600 dark:text-slate-400">
                                                <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1">
                                                    <span>Bit weights:</span>
                                                    <span>-128  64  32  16   8   4   2   1</span>
                                                </div>
                                                <div className="flex justify-between text-slate-900 dark:text-slate-100 font-bold">
                                                    <span>Bits:</span>
                                                    <span>   1   0   0   1   1   0   1   1</span>
                                                </div>
                                                <div className="mt-2 text-indigo-700 dark:text-indigo-400">
                                                    Value = -128 + 16 + 8 + 2 + 1 = <strong>-101</strong>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <FormulaBox 
                                            title="C2 Range Rules"
                                            formulas={[
                                                "Valid signed range on N bits:",
                                                "[-2^(N-1), 2^(N-1)-1]"
                                            ]}
                                        />
                                    </div>
                                </div>
                            </Card>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="rounded-3xl border-2 border-slate-800 bg-slate-900 p-6 text-white shadow-lg">
                                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                        <span className="text-blue-400">SM</span> Most Significant Bit
                                    </h3>
                                    <div className="text-slate-300 text-sm leading-relaxed">
                                        <p className="mb-2">The leftmost bit is a <strong>sign flag ONLY</strong>.</p>
                                        <p>It does not have numerical value, making arithmetic operations complex.</p>
                                    </div>
                                </div>
                                <div className="rounded-3xl border-2 border-indigo-600 bg-indigo-600 p-6 text-white shadow-lg">
                                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                        <span className="text-indigo-200">C2</span> Most Significant Bit
                                    </h3>
                                    <div className="text-indigo-100 text-sm leading-relaxed">
                                        <p className="mb-2">The leftmost bit has a <strong>negative numerical value</strong>.</p>
                                        <p>It contributes <span className="font-mono bg-indigo-800 px-1 rounded">-2^(N-1)</span> to the total sum.</p>
                                    </div>
                                </div>
                            </div>

                            <Card title="3. Bit-Width & Alignment Theory" subtitle="Width matters before doing any arithmetic" icon={BookOpen}>
                                <div className="space-y-6 text-sm leading-6 text-slate-600 dark:text-slate-400">
                                    <div>
                                        <strong>Bit width must be chosen before representation.</strong> Using too few bits breaks the representation because the negative weight of the MSB lands in the wrong place.
                                    </div>

                                    <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 p-4">
                                        <div className="font-bold text-amber-900 dark:text-amber-300 mb-2">Extending / Aligning Widths</div>
                                        <p className="text-amber-800 dark:text-amber-400">
                                            If one operand is on 8 bits and another is on 6 bits, <strong>they cannot be safely combined in arithmetic</strong>. 
                                            Both operands must be represented on the <strong>same width</strong> before addition or multiplication.
                                        </p>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                                            <div className="font-bold text-slate-900 dark:text-slate-100 mb-2">Zero Extension</div>
                                            <p className="mb-3 text-xs">Used for unsigned style extension. Fill new left bits with <span className="font-mono">0</span>.</p>
                                            <div className="font-mono text-xs bg-slate-50 dark:bg-slate-900 p-2 rounded">
                                                <div>Original (4-bit):  1011 (Unsigned 11)</div>
                                                <div>Extended (8-bit):  <span className="text-emerald-600 dark:text-emerald-500 font-bold">0000</span>1011 (=11)</div>
                                            </div>
                                        </div>
                                        <div className="rounded-xl border border-indigo-200 bg-indigo-50 dark:bg-indigo-900/20 p-4">
                                            <div className="font-bold text-indigo-900 dark:text-indigo-300 mb-2">Sign Extension</div>
                                            <p className="mb-3 text-xs text-indigo-800">Used for signed C2 values. Copy the leftmost bit into the new bits to preserve the negative weight balance.</p>
                                            <div className="font-mono text-xs bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-800 p-2 rounded">
                                                <div>Original (4-bit):  <span className="text-red-600 dark:text-red-500 font-bold">1</span>011 (C2 -5)</div>
                                                <div>Extended (8-bit):  <span className="text-red-600 dark:text-red-500 font-bold">11111</span>011 (= -5)</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <Card title="4. Fixed-Point Theory" subtitle="Encoding fractions into integers" icon={Divide}>
                                <div className="space-y-4 text-sm leading-6 text-slate-600 dark:text-slate-400">
                                    <p>
                                        In fixed-point math, the register simply stores an <strong>integer</strong> in C2. 
                                        The fraction is implied by agreeing on the number of fractional bits (<span className="font-mono">f</span>).
                                    </p>

                                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                                        <div className="font-semibold text-slate-900 dark:text-slate-100 mb-2 border-b border-slate-200 dark:border-slate-700 pb-2">Example: 101 / 128</div>
                                        <ul className="space-y-2 text-xs">
                                            <li><span className="font-mono">128</span> is <span className="font-mono">2^7</span>, so the denominator is naturally a power of 2.</li>
                                            <li>The integer <span className="font-mono">101</span> is <span className="font-mono">1100101₂</span>.</li>
                                            <li>Dividing by <span className="font-mono">2^7</span> is a right shift: <span className="font-mono font-semibold text-indigo-700 dark:text-indigo-400">101 / 2^7 = 0.1100101₂</span></li>
                                            <li className="pt-2 text-slate-500 dark:text-slate-400">
                                                For negative fractions like <span className="font-mono">-101/128</span> we just store the scaled C2 representation of the integer <span className="font-mono">-101</span>, keeping <span className="font-mono">f=7</span> in mind for the decoder.
                                            </li>
                                        </ul>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                                        <FormulaBox 
                                            title="Encoding Rule"
                                            formulas={[
                                                "stored_int = round(real_val × 2^f)"
                                            ]}
                                        />
                                        <FormulaBox 
                                            title="Decoding Rule"
                                            formulas={[
                                                "real_val = stored_int / 2^f"
                                            ]}
                                        />
                                    </div>
                                </div>
                            </Card>

                            <Card title="5. Worked Examples (Static)" subtitle="How to solve step-by-step by hand" icon={BookOpen}>
                                <div className="space-y-8">
                                    <div>
                                        <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2 mb-4 cursor-pointer">Integer Examples</h4>
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
                                                <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-3 font-semibold text-slate-800 dark:text-slate-200 text-center">
                                                    Convert -83 to 8-bit C2
                                                </div>
                                                <div className="p-2 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                                                    <WorkedExampleRow step="Width" title="Chosen width">
                                                        <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">8 bits</span>
                                                    </WorkedExampleRow>
                                                    <WorkedExampleRow step="|x| (8-bit)" title="Magnitude on full width">
                                                        83 = <span className="font-mono font-semibold tracking-wider text-slate-900 dark:text-slate-100">01010011</span>
                                                    </WorkedExampleRow>
                                                    <WorkedExampleRow step="Invert" title="Flip all bits">
                                                        <span className="font-mono tracking-wider text-amber-700 dark:text-amber-500">10101100</span>
                                                    </WorkedExampleRow>
                                                    <WorkedExampleRow step="Add 1" title="Add 1 to inverted">
                                                        <span className="font-mono tracking-wider font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1 rounded">10101101</span>
                                                    </WorkedExampleRow>
                                                    <WorkedExampleRow step="Result" title="Final 8-bit C2">
                                                        <strong>-83</strong> is <span className="font-mono font-bold text-slate-900 dark:text-slate-100">10101101</span>
                                                    </WorkedExampleRow>
                                                </div>
                                            </div>

                                            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
                                                <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-3 font-semibold text-slate-800 dark:text-slate-200 text-center">
                                                    Convert -105 to 8-bit C2
                                                </div>
                                                <div className="p-2 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                                                    <WorkedExampleRow step="Width" title="Chosen width">
                                                        <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">8 bits</span>
                                                    </WorkedExampleRow>
                                                    <WorkedExampleRow step="|x| (8-bit)" title="Magnitude on full width">
                                                        105 = <span className="font-mono font-semibold tracking-wider text-slate-900 dark:text-slate-100">01101001</span>
                                                    </WorkedExampleRow>
                                                    <WorkedExampleRow step="Invert" title="Flip all bits">
                                                        <span className="font-mono tracking-wider text-amber-700 dark:text-amber-500">10010110</span>
                                                    </WorkedExampleRow>
                                                    <WorkedExampleRow step="Add 1" title="Add 1 to inverted">
                                                        <span className="font-mono tracking-wider font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1 rounded">10010111</span>
                                                    </WorkedExampleRow>
                                                    <WorkedExampleRow step="Result" title="Final 8-bit C2">
                                                        <strong>-105</strong> is <span className="font-mono font-bold text-slate-900 dark:text-slate-100">10010111</span>
                                                    </WorkedExampleRow>
                                                </div>
                                            </div>
                                            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden md:col-span-2">
                                                <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-3 font-semibold text-slate-800 dark:text-slate-200 text-center">
                                                    Sign Extend -5 from 4-bit to 8-bit (C2)
                                                </div>
                                                <div className="p-2 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                                                    <WorkedExampleRow step="Start (4-bit)" title="Original C2">
                                                        -5 on 4 bits is <span className="font-mono font-semibold tracking-wider text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-1 rounded">1011</span>
                                                    </WorkedExampleRow>
                                                    <WorkedExampleRow step="Sign Bit" title="Identify MSB">
                                                        The leftmost bit is <span className="font-mono font-bold text-red-600 dark:text-red-500">1</span>
                                                    </WorkedExampleRow>
                                                    <WorkedExampleRow step="Extend to 8-bit" title="Copy sign bit">
                                                        Pad 4 copies of the sign bit to the left: <span className="font-mono tracking-wider font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1 rounded"><span className="text-red-600 dark:text-red-500">1111</span>1011</span>
                                                    </WorkedExampleRow>
                                                    <WorkedExampleRow step="SM Warning!" title="Careful with SM">
                                                        <span className="text-amber-800 dark:text-amber-400">If this were Sign-Magnitude <strong>1011</strong> (which is -3), extending to 8 bits means <strong>moving</strong> the sign bit, not copying it: <span className="font-mono font-bold">10000011</span>. This is why C2 is preferred in hardware!</span>
                                                    </WorkedExampleRow>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">Fractional Fixed-Point Examples</h4>
                                        <div className="space-y-6">
                                            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
                                                <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-3 font-semibold text-slate-800 dark:text-slate-200">
                                                    Encoding 101/128 into C2
                                                </div>
                                                <div className="p-2 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                                                    <WorkedExampleRow step="Analysis">
                                                        Denominator is <span className="font-mono">128 = 2^7</span>. We need <span className="font-mono">f=7</span> fractional bits.
                                                    </WorkedExampleRow>
                                                    <WorkedExampleRow step="Binary point">
                                                        <span className="font-mono">101</span> = <span className="font-mono text-slate-900 dark:text-slate-100 font-bold tracking-wider">1100101₂</span>. Moving point 7 spaces left: <span className="font-mono text-indigo-700 dark:text-indigo-400 font-bold tracking-wider">0.1100101₂</span> 
                                                    </WorkedExampleRow>
                                                    <WorkedExampleRow step="Scaled Int">
                                                        Store scaled integer <span className="font-mono font-bold">101</span>
                                                    </WorkedExampleRow>
                                                    <WorkedExampleRow step="C2 Result">
                                                        On 8 bits, positive 101 is <span className="font-mono font-bold tracking-wider text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-1 rounded">01100101</span>
                                                    </WorkedExampleRow>
                                                </div>
                                            </div>

                                            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
                                                <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-3 font-semibold text-slate-800 dark:text-slate-200">
                                                    Encoding -44/64 into 8-bit C2
                                                </div>
                                                <div className="p-2 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                                                    <WorkedExampleRow step="Analysis">
                                                        Denominator is <span className="font-mono">64 = 2^6</span>. We need <span className="font-mono">f=6</span> fractional bits.
                                                    </WorkedExampleRow>
                                                    <WorkedExampleRow step="Scaled Int">
                                                        Store the integer <span className="font-mono font-bold">-44</span> as scaled representation. 
                                                    </WorkedExampleRow>
                                                    <WorkedExampleRow step="|x| (8-bit)">
                                                        |-44| = 44 = <span className="font-mono tracking-wider font-semibold">00101100</span>
                                                    </WorkedExampleRow>
                                                    <WorkedExampleRow step="Invert & Add 1">
                                                        <span className="font-mono tracking-wider text-amber-700 dark:text-amber-500">11010011</span> + 1 = <span className="font-mono text-indigo-700 dark:text-indigo-400 tracking-wider font-bold">11010100</span>
                                                    </WorkedExampleRow>
                                                    <WorkedExampleRow step="C2 Result">
                                                        <strong>-44</strong> stored on 8 bits is <span className="font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-1 rounded tracking-wider">11010100</span>
                                                    </WorkedExampleRow>
                                                </div>
                                            </div>

                                            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden md:col-span-2">
                                                <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-3 font-semibold text-slate-800 dark:text-slate-200 text-center">
                                                    Alignment: Adding -44/64 and -101/128
                                                </div>
                                                <div className="p-2 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                                                    <WorkedExampleRow step="Problem" title="Mismatch">
                                                        Denominators mismatch. <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">f=6</span> vs <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">f=7</span>.
                                                    </WorkedExampleRow>
                                                    <WorkedExampleRow step="Scale up" title="Match Denominators">
                                                        Multiply numerator/denominator of <span className="font-mono">-44/64</span> by 2: <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400">-88/128</span>.
                                                    </WorkedExampleRow>
                                                    <WorkedExampleRow step="New Setup" title="Same f">
                                                        Now both operands share the same <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">f=7</span> alignment.
                                                    </WorkedExampleRow>
                                                    <WorkedExampleRow step="Hardware" title="Add Integers directly">
                                                        Hardware can now simply add the newly aligned C2 integers <span className="font-mono font-bold">-88</span> and <span className="font-mono font-bold">-101</span> directly.
                                                    </WorkedExampleRow>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        <Card title="6. Booth Multiplicand Prep (M, -M, 2M, -2M)" subtitle="Precomputing operands for Radix-3 and Radix-4" icon={Calculator}>
                            <div className="space-y-6 text-sm leading-6 text-slate-600 dark:text-slate-400">
                                <p>
                                    Before starting a Booth multiplication table, you must establish the fixed bit-width and precompute your multiplicand variants. Radix-3 uses <code>M</code> and <code>-M</code>, while Radix-4 occasionally requires <code>2M</code> and <code>-2M</code>.
                                </p>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
                                        <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-3 font-semibold text-slate-800 dark:text-slate-200 text-center">
                                            Generating -M
                                        </div>
                                        <div className="p-4 space-y-3">
                                            <p className="text-xs">Take the Two's Complement of your assigned multiplicand <code>M</code>.</p>
                                            <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded text-xs font-mono border border-slate-100 dark:border-slate-800">
                                                <div className="flex justify-between"><span>M:</span> <span className="font-bold text-slate-900 dark:text-slate-100">001011 (11)</span></div>
                                                <div className="flex justify-between text-amber-700 dark:text-amber-500"><span>Invert:</span> <span>110100</span></div>
                                                <div className="flex justify-between text-indigo-700 dark:text-indigo-400"><span>+ 1:</span> <span className="font-bold">110101 (-11)</span></div>
                                                <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 mt-2 pt-1 font-bold"><span>-M:</span> <span>110101</span></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
                                        <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-3 font-semibold text-slate-800 dark:text-slate-200 text-center">
                                            Generating 2M
                                        </div>
                                        <div className="p-4 space-y-3">
                                            <p className="text-xs">Arithmetic Left Shift (ALS) the multiplicand <code>M</code> by 1 position. Drop the MSB and append a 0 at the LSB.</p>
                                            <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded text-xs font-mono border border-slate-100 dark:border-slate-800">
                                                <div className="flex justify-between"><span>M:</span> <span className="font-bold text-slate-900 dark:text-slate-100">001011 (11)</span></div>
                                                <div className="flex justify-between text-indigo-700 dark:text-indigo-400"><span>Shift Left:</span> <span>01011_</span></div>
                                                <div className="flex justify-between text-indigo-700 dark:text-indigo-400"><span>Append 0:</span> <span>010110</span></div>
                                                <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 mt-2 pt-1 font-bold"><span>2M:</span> <span>010110 (22)</span></div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden md:col-span-2 mt-2">
                                        <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-3 font-semibold text-slate-800 dark:text-slate-200 text-center">
                                            Generating -2M
                                        </div>
                                        <div className="p-4 space-y-3">
                                            <p className="text-xs">Take the Two's Complement of <code>2M</code> (not <code>-M</code>, though shifting <code>-M</code> also works!).</p>
                                            <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded text-xs font-mono border border-slate-100 dark:border-slate-800">
                                                <div className="flex justify-between"><span>2M:</span> <span className="font-bold text-slate-900 dark:text-slate-100">010110 (22)</span></div>
                                                <div className="flex justify-between text-amber-700 dark:text-amber-500"><span>Invert:</span> <span>101001</span></div>
                                                <div className="flex justify-between text-indigo-700 dark:text-indigo-400"><span>+ 1:</span> <span className="font-bold">101010 (-22)</span></div>
                                                <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 mt-2 pt-1 font-bold"><span>-2M:</span> <span>101010</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card title="Interactive integer converter" subtitle="Decimal ↔ SM ↔ C2 with full steps" icon={Calculator}>
                            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                                <div className="space-y-4 rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">Decimal integer</label>
                                        <input
                                            type="number"
                                            value={intValue}
                                            onChange={(e) => setIntValue(parseInt(e.target.value || "0", 10))}
                                            className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 outline-none ring-0 transition focus:border-slate-400"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">Bit width</label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setIntBitsMode("auto")}
                                                className={classNames(
                                                    "rounded-2xl px-3 py-2 text-sm font-medium",
                                                    intBitsMode === "auto" ? "bg-slate-900 text-white" : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                                )}
                                            >
                                                Auto
                                            </button>
                                            <button
                                                onClick={() => setIntBitsMode("manual")}
                                                className={classNames(
                                                    "rounded-2xl px-3 py-2 text-sm font-medium",
                                                    intBitsMode === "manual" ? "bg-slate-900 text-white" : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                                )}
                                            >
                                                Manual
                                            </button>
                                        </div>
                                    </div>

                                    {intBitsMode === "manual" ? (
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">Manual bits</label>
                                            <input
                                                type="number"
                                                min={2}
                                                value={intBitsManual}
                                                onChange={(e) => setIntBitsManual(Math.max(2, parseInt(e.target.value || "2", 10)))}
                                                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 outline-none transition focus:border-slate-400"
                                            />
                                        </div>
                                    ) : null}

                                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm text-slate-600 dark:text-slate-400">
                                        <div className="font-semibold text-slate-900 dark:text-slate-100">Width summary</div>
                                        <div className="mt-2">Auto minimum: <span className="font-mono">{intAnalysis.autoBits}</span> bits</div>
                                        <div>Using now: <span className="font-mono">{intAnalysis.bits}</span> bits</div>
                                        <div>Range: <span className="font-mono">[{intAnalysis.rangeMin}, {intAnalysis.rangeMax}]</span></div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <div className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">SM</div>
                                            <Mono big>{groupBits(intAnalysis.sm)}</Mono>
                                        </div>
                                        <div>
                                            <div className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">C2</div>
                                            <Mono big>{groupBits(intAnalysis.c2)}</Mono>
                                        </div>
                                    </div>

                                    <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                                        <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Step by step</div>
                                        <div className="grid gap-3 md:grid-cols-2">
                                            <div>
                                                <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">SM building</div>
                                                <div className="mt-2 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                                                    <div>sign bit = <span className="font-mono">{intValue < 0 ? "1" : "0"}</span></div>
                                                    <div>magnitude = <span className="font-mono">{Math.abs(intValue)} = {Math.abs(intValue).toString(2)}</span></div>
                                                    <div>SM = <span className="font-mono">{groupBits(intAnalysis.sm)}</span></div>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">C2 building</div>
                                                <div className="mt-2 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                                                    <div>|x| on full width = <span className="font-mono">{groupBits(intAnalysis.positiveFull)}</span></div>
                                                    {intValue < 0 ? (
                                                        <>
                                                            <div>invert = <span className="font-mono">{groupBits(intAnalysis.inverted)}</span></div>
                                                            <div>+1 = <span className="font-mono">{groupBits(intAnalysis.plusOne)}</span></div>
                                                        </>
                                                    ) : (
                                                        <div>positive number, so C2 stays the same</div>
                                                    )}
                                                    <div>C2 = <span className="font-mono">{groupBits(intAnalysis.c2)}</span></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card title="Interactive binary converters" subtitle="Type raw bits and decode them" icon={ArrowRightLeft}>
                            <div className="grid gap-6 lg:grid-cols-2">
                                <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
                                    <div className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">SM → decimal → C2</div>
                                    <input
                                        value={smInput}
                                        onChange={(e) => setSmInput(e.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono outline-none transition focus:border-slate-400"
                                        placeholder="example: 11001001"
                                    />

                                    {smConverter ? (
                                        <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                                                <span className="font-semibold text-slate-800 dark:text-slate-200">1. Interpretation</span>
                                                <div className="flex gap-2 text-xs">
                                                    <div>Bits: <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">{smConverter.bits}</span></div>
                                                    <div>Sign: <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">{smConverter.sign}</span></div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-[100px_1fr] gap-2 items-baseline">
                                                <span className="text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wide">Magnitude</span>
                                                <span className="font-mono">{smConverter.magnitude || "0"} = {smConverter.magnitudeDecimal}</span>
                                            </div>
                                            <div className="grid grid-cols-[100px_1fr] gap-2 items-baseline border-b border-slate-100 dark:border-slate-800 pb-2">
                                                <span className="text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wide">Decimal</span>
                                                <span className="font-semibold text-slate-900 dark:text-slate-100 text-base">{smConverter.decimal}</span>
                                            </div>

                                            <div className="pt-1">
                                                <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-2">2. C2 Conversion Steps</span>
                                                <div className="grid grid-cols-[100px_1fr] gap-2 items-baseline">
                                                    <span className="text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wide">|x| width</span>
                                                    <span className="font-mono">{groupBits(smConverter.positiveFull)}</span>
                                                </div>
                                                {smConverter.decimal < 0 ? (
                                                    <>
                                                        <div className="grid grid-cols-[100px_1fr] gap-2 items-baseline">
                                                            <span className="text-amber-600 font-medium text-xs uppercase tracking-wide">Invert</span>
                                                            <span className="font-mono text-amber-700 dark:text-amber-500">{groupBits(smConverter.inverted)}</span>
                                                        </div>
                                                        <div className="grid grid-cols-[100px_1fr] gap-2 items-baseline">
                                                            <span className="text-indigo-600 font-medium text-xs uppercase tracking-wide">+1</span>
                                                            <span className="font-mono text-indigo-700 dark:text-indigo-400 font-bold">{groupBits(smConverter.plusOne)}</span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-xs italic text-slate-400 pl-[108px] mt-1">Value is positive, C2 matches SM magnitude.</div>
                                                )}
                                                <div className="grid grid-cols-[100px_1fr] gap-2 items-baseline mt-2 bg-slate-50 dark:bg-slate-900 p-2 rounded">
                                                    <span className="text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wide">C2 Result</span>
                                                    <span className="font-mono text-slate-900 dark:text-slate-100 font-bold">{groupBits(smConverter.c2)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>

                                <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
                                    <div className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">C2 → decimal → SM</div>
                                    <input
                                        value={c2Input}
                                        onChange={(e) => setC2Input(e.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono outline-none transition focus:border-slate-400"
                                        placeholder="example: 10011011"
                                    />

                                    {c2Converter ? (
                                        <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                                                <span className="font-semibold text-slate-800 dark:text-slate-200">1. Interpretation</span>
                                                <div>Bits: <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">{c2Converter.bits}</span></div>
                                            </div>
                                            
                                            <div className="grid grid-cols-[100px_1fr] gap-2 items-baseline border-b border-slate-100 dark:border-slate-800 pb-2">
                                                <span className="text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wide">Decimal</span>
                                                <span className="font-semibold text-slate-900 dark:text-slate-100 text-base">{c2Converter.decimal}</span>
                                            </div>

                                            <div className="pt-1">
                                                <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-2">2. SM Conversion Steps</span>
                                                {c2Converter.negative ? (
                                                    <div className="space-y-2">
                                                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">
                                                            This is negative. To recover the absolute magnitude, we must take the Two's Complement of the C2 number again (<span className="font-mono">invert + 1</span>):
                                                        </div>
                                                        <div className="grid grid-cols-[100px_1fr] gap-2 items-baseline bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-800">
                                                            <span className="text-slate-800 dark:text-slate-200 font-medium text-xs uppercase tracking-wide">Magnitude</span>
                                                            <div className="font-mono">
                                                                <span className="text-slate-400 line-through mr-2">{groupBits(c2Input.replace(/[^01]/g, ""))}</span>
                                                                <span className="font-bold text-slate-900 dark:text-slate-100">→ {groupBits(c2Converter.backToPositive)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">
                                                        This is positive. The magnitude is read directly from the remaining bits after the sign bit.
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-[100px_1fr] gap-2 items-baseline mt-4 bg-slate-50 dark:bg-slate-900 p-2 rounded">
                                                    <span className="text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wide">SM Result</span>
                                                    <span className="font-mono text-slate-900 dark:text-slate-100 font-bold">{groupBits(c2Converter.sm)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </Card>
                    </div>

                    <div className="animate-fade-in-up space-y-6">
                        <Card title="Fractional fixed-point converter" subtitle="The same idea used before Booth for course-style fractional examples" icon={Divide}>
                            <div className="space-y-4 rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
                                <div className="grid grid-cols-5 items-end gap-2">
                                    <div className="col-span-2">
                                        <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">Numerator</label>
                                        <input
                                            type="number"
                                            value={fracNum}
                                            onChange={(e) => setFracNum(parseInt(e.target.value || "0", 10))}
                                            className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 outline-none transition focus:border-slate-400"
                                        />
                                    </div>
                                    <div className="pb-2 text-center text-slate-400">/</div>
                                    <div className="col-span-2">
                                        <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">Denominator</label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={fracDen}
                                            onChange={(e) => setFracDen(Math.max(1, parseInt(e.target.value || "1", 10)))}
                                            className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 outline-none transition focus:border-slate-400"
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">Fractional bits</label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setFracBitsMode("auto")}
                                                className={classNames(
                                                    "rounded-2xl px-3 py-2 text-sm font-medium",
                                                    fracBitsMode === "auto" ? "bg-slate-900 text-white" : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                                )}
                                            >
                                                Auto
                                            </button>
                                            <button
                                                onClick={() => setFracBitsMode("manual")}
                                                className={classNames(
                                                    "rounded-2xl px-3 py-2 text-sm font-medium",
                                                    fracBitsMode === "manual" ? "bg-slate-900 text-white" : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                                )}
                                            >
                                                Manual
                                            </button>
                                        </div>
                                        {fracBitsMode === "manual" ? (
                                            <input
                                                type="number"
                                                min={1}
                                                value={fracBitsManual}
                                                onChange={(e) => setFracBitsManual(Math.max(1, parseInt(e.target.value || "1", 10)))}
                                                className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 outline-none transition focus:border-slate-400"
                                            />
                                        ) : null}
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">Total bits</label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setTotalBitsMode("auto")}
                                                className={classNames(
                                                    "rounded-2xl px-3 py-2 text-sm font-medium",
                                                    totalBitsMode === "auto" ? "bg-slate-900 text-white" : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                                )}
                                            >
                                                Auto
                                            </button>
                                            <button
                                                onClick={() => setTotalBitsMode("manual")}
                                                className={classNames(
                                                    "rounded-2xl px-3 py-2 text-sm font-medium",
                                                    totalBitsMode === "manual" ? "bg-slate-900 text-white" : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                                )}
                                            >
                                                Manual
                                            </button>
                                        </div>
                                        {totalBitsMode === "manual" ? (
                                            <input
                                                type="number"
                                                min={2}
                                                value={totalBitsManual}
                                                onChange={(e) => setTotalBitsManual(Math.max(2, parseInt(e.target.value || "2", 10)))}
                                                className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 outline-none transition focus:border-slate-400"
                                            />
                                        ) : null}
                                    </div>
                                </div>
                            </div>

                            {!fracAnalysis.powerOfTwoDen ? (
                                <div className="mt-4 flex gap-3 rounded-3xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 p-4 text-sm text-amber-900 dark:text-amber-300">
                                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                                    <div>
                                        Your denominator is not a power of two. This still works as an approximation, but it is not an exact binary fraction.
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-4 flex gap-3 rounded-3xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 p-4 text-sm text-emerald-900 dark:text-emerald-300">
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                                    <div>
                                        This denominator is a power of two, so the fixed-point representation is exact when enough fractional bits are used.
                                    </div>
                                </div>
                            )}

                            <div className="mt-4 space-y-4">
                                <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
                                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                                        <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">Fixed-Point Analysis</h4>
                                        <div className="flex gap-2">
                                            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-1 rounded-full font-mono">f={fracAnalysis.fracBits}</span>
                                            <span className="text-xs bg-slate-800 text-white px-2 py-1 rounded-full font-mono">{fracAnalysis.totalBits} total bits</span>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">1. Scaling the value</div>
                                            <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                                                <div className="flex justify-between">
                                                    <span>Original real value =</span>
                                                    <span className="font-mono">{fracNum} / {fracAnalysis.safeDen} &approx; {fracAnalysis.exactDecimal.toFixed(4)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Scale factor =</span>
                                                    <span className="font-mono">2^{fracAnalysis.fracBits} = {2 ** fracAnalysis.fracBits}</span>
                                                </div>
                                                <div className="flex justify-between font-medium text-slate-900 dark:text-slate-100 border-t border-slate-200 dark:border-slate-700 mt-2 pt-2">
                                                    <span>Scaled integer to store =</span>
                                                    <span className="font-mono">round({fracNum}/{fracAnalysis.safeDen} &times; {2 ** fracAnalysis.fracBits}) = {fracAnalysis.scaled}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">2. Converting scaled integer to C2</div>
                                            <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                                                <div className="flex justify-between">
                                                    <span>Integer magnitude on {fracAnalysis.totalBits} bits =</span>
                                                    <span className="font-mono">{groupBits(Math.abs(fracAnalysis.scaled).toString(2).padStart(fracAnalysis.totalBits, "0"))}</span>
                                                </div>
                                                {fracAnalysis.scaled < 0 ? (
                                                    <>
                                                        <div className="flex justify-between text-amber-700 dark:text-amber-500">
                                                            <span>Invert bits =</span>
                                                            <span className="font-mono">{groupBits(invertBits(Math.abs(fracAnalysis.scaled).toString(2).padStart(fracAnalysis.totalBits, "0")))}</span>
                                                        </div>
                                                        <div className="flex justify-between text-indigo-700 dark:text-indigo-400">
                                                            <span>Add 1 =</span>
                                                            <span className="font-mono font-bold tracking-wider">{groupBits(fracAnalysis.c2)}</span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-xs italic text-slate-500 dark:text-slate-400">Value is positive, so C2 stays the same as magnitude.</div>
                                                )}
                                                <div className="flex justify-between font-bold text-slate-900 dark:text-slate-100 border-t border-slate-200 dark:border-slate-700 mt-2 pt-2 bg-slate-100 dark:bg-slate-800 p-2 rounded -mx-2 px-2">
                                                    <span>Final C2 Registration =</span>
                                                    <span className="font-mono">{groupBits(fracAnalysis.c2)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">3. Decoding check</div>
                                            <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                                                <div className="flex justify-between">
                                                    <span>Decode by computing:</span>
                                                    <span className="font-mono text-slate-500 dark:text-slate-400">stored / 2^f</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Calculated fraction =</span>
                                                    <span className="font-mono">{fracAnalysis.scaled} / {2 ** fracAnalysis.fracBits}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Simplified (GCD) =</span>
                                                    <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{fracAnalysis.decoded.fraction}</span>
                                                </div>
                                                <div className="flex justify-between font-medium">
                                                    <span>Decoded decimal =</span>
                                                    <span className="font-mono text-slate-900 dark:text-slate-100">&approx; {fracAnalysis.decoded.decimal.toFixed(4)}</span>
                                                </div>
                                                {fracAnalysis.error !== 0 && (
                                                    <div className="flex justify-between text-amber-700 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/30 p-2 rounded mt-2 text-xs">
                                                        <span>Approximation Error =</span>
                                                        <span className="font-mono">{fracAnalysis.error.toExponential(2)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card title="Fixed-point binary decoder" subtitle="Paste a C2 word and interpret it as a fixed-point value" icon={Binary}>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">Fixed-point C2 bits</label>
                                <input
                                    value={fixedC2Input}
                                    onChange={(e) => setFixedC2Input(e.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono outline-none transition focus:border-slate-400"
                                    placeholder="example: 10011011"
                                />
                            </div>

                            {fixedConverter ? (
                                <div className="mt-4 space-y-4">
                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
                                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide border-b border-slate-100 dark:border-slate-800 pb-2">Decoding Steps</div>
                                        <div className="grid grid-cols-[140px_1fr] gap-2 items-baseline text-sm text-slate-700 dark:text-slate-300">
                                            <span className="font-medium text-slate-500 dark:text-slate-400">Total Bits</span>
                                            <span className="font-mono bg-slate-50 dark:bg-slate-900 px-1 rounded">{fixedConverter.bits}</span>
                                        </div>
                                        <div className="grid grid-cols-[140px_1fr] gap-2 items-baseline text-sm text-slate-700 dark:text-slate-300">
                                            <span className="font-medium text-slate-500 dark:text-slate-400">Fractional Bits (f)</span>
                                            <span className="font-mono bg-slate-50 dark:bg-slate-900 px-1 rounded">{fixedConverter.fracBits}</span>
                                        </div>
                                        <div className="grid grid-cols-[140px_1fr] gap-2 items-baseline text-sm text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                                            <span className="font-medium text-slate-500 dark:text-slate-400">Step 1: Raw Integer</span>
                                            <div className="flex flex-col gap-1">
                                                <span>Interpret the bits as a normal signed C2 integer:</span>
                                                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-lg bg-slate-100 dark:bg-slate-800 self-start px-2 rounded">{fixedConverter.raw}</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-[140px_1fr] gap-2 items-baseline text-sm text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                                            <span className="font-medium text-slate-500 dark:text-slate-400">Step 2: Decode</span>
                                            <div className="flex flex-col gap-1">
                                                <span>Divide by <span className="font-mono">2^{fixedConverter.fracBits}</span> ({2 ** fixedConverter.fracBits}) to get the real fraction:</span>
                                                <span className="font-mono text-indigo-700 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/30 self-start px-2 py-0.5 rounded">{fixedConverter.raw} / {2 ** fixedConverter.fracBits}</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-[140px_1fr] gap-2 items-baseline text-sm text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                                            <span className="font-medium text-slate-500 dark:text-slate-400">Step 3: Simplify</span>
                                            <div className="flex flex-col gap-1">
                                                <span className="font-mono font-bold tracking-wider text-slate-900 dark:text-slate-100">{fixedConverter.fraction}</span>
                                                <span className="text-slate-500 dark:text-slate-400">&approx; {fixedConverter.decimal.toFixed(4)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </Card>

                        <Card title="Quick Formula Sheet" subtitle="Keep this nearby" icon={Sigma}>
                            <div className="space-y-3 text-sm leading-7 text-slate-700 dark:text-slate-300">
                                <div><span className="font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded mr-2">C2 range on N bits</span> <span className="font-mono text-indigo-700 dark:text-indigo-400 font-semibold tracking-wide">[-2^(N-1), 2^(N-1)-1]</span></div>
                                <div><span className="font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded mr-2">SM</span> sign bit + absolute magnitude bits</div>
                                <div><span className="font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded mr-2">Negative C2</span> <span className="font-mono text-indigo-700 dark:text-indigo-400 font-semibold tracking-wide">invert(|x| on full width) + 1</span></div>
                                <div><span className="font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded mr-2">Fixed-point encoding</span> <span className="font-mono text-indigo-700 dark:text-indigo-400 font-semibold tracking-wide">stored = round(real × 2^f)</span></div>
                                <div><span className="font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded mr-2">Fixed-point decoding</span> <span className="font-mono text-indigo-700 dark:text-indigo-400 font-semibold tracking-wide">real = stored / 2^f</span></div>
                            </div>
                        </Card>

                        <Card title="What students usually confuse" subtitle="Quick fixes for common mistakes" icon={Lightbulb}>
                            <div className="space-y-5 text-sm leading-6 text-slate-600 dark:text-slate-400">
                                <div className="border-l-4 border-amber-400 pl-4 py-1">
                                    <div className="font-bold text-slate-900 dark:text-slate-100">1. Choosing the width too late</div>
                                    <p>A binary representation can be correct on 8 bits but completely wrong if you just chop off a bit to make it 7 bits. <strong>Always lock in and choose your target width FIRST</strong> before writing down |x| or performing any inversions.</p>
                                </div>
                                <div className="border-l-4 border-amber-400 pl-4 py-1">
                                    <div className="font-bold text-slate-900 dark:text-slate-100">2. Confusing SM Sign bit and C2 MSB</div>
                                    <p>In Sign-Magnitude, the leftmost bit is just a boolean flag. In Two's Complement, the leftmost bit has a massive negative literal weight <span className="font-mono">(-2^(N-1))</span>. Don't build negative C2 numbers by just "flipping the sign bit" of a positive number.</p>
                                </div>
                                <div className="border-l-4 border-amber-400 pl-4 py-1">
                                    <div className="font-bold text-slate-900 dark:text-slate-100">3. Mixing operands of different widths</div>
                                    <p>Before any hardware addition or multiplication, both values <strong>must be on the same bit width</strong>. If you try to add a 6-bit number and an 8-bit number without <strong>Sign Extending</strong> the smaller number first, everything breaks.</p>
                                </div>
                                <div className="border-l-4 border-amber-400 pl-4 py-1">
                                    <div className="font-bold text-slate-900 dark:text-slate-100">4. Misunderstanding fixed-point storage</div>
                                    <p>Inside the hardware register, there is no "decimal point", only an <strong>integer</strong> stored in C2. The decimal point location (<span className="font-mono">f</span>) is just agreed upon by the programmer and interpreting circuits AFTER the operation.</p>
                                </div>
                                <div className="border-l-4 border-amber-400 pl-4 py-1">
                                    <div className="font-bold text-slate-900 dark:text-slate-100">5. Treating arbitrary denominators as exact fractions</div>
                                    <p>Denominators like /10 or /25 are usually approximations in binary fixed-point. Exact binary fractions only reliably happen when the denominator is a clean power of 2 like 4, 8, 16, 64, or 128.</p>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
