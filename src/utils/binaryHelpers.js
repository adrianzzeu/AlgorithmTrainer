export const addBinaryStr = (aStr, bStr) => {
  let carry = 0;
  let result = "";

  const maxLen = Math.max(aStr.length, bStr.length);
  const aPadded = aStr.padStart(maxLen, "0");
  const bPadded = bStr.padStart(maxLen, "0");

  for (let i = maxLen - 1; i >= 0; i--) {
    const sum = Number(aPadded[i]) + Number(bPadded[i]) + carry;
    result = String(sum % 2) + result;
    carry = Math.floor(sum / 2);
  }

  return { result, carryOut: carry };
};

export const invertBits = (binStr) =>
  binStr
    .split("")
    .map((b) => (b === "0" ? "1" : "0"))
    .join("");

export const getTwosComplementStr = (binStr) => {
  const inverted = invertBits(binStr);
  return addBinaryStr(inverted, "1".padStart(binStr.length, "0")).result;
};

export const signExtend = (binStr, newLen) => {
  if (binStr.length >= newLen) return binStr;
  return binStr[0].repeat(newLen - binStr.length) + binStr;
};

export const requiredBitsForSignedInt = (num) => {
  let bits = 1;
  while (num < -(2 ** (bits - 1)) || num > 2 ** (bits - 1) - 1) {
    bits++;
  }
  return bits;
};

export const intToC2 = (num, bits) => {
  if (num >= 0) {
    return num.toString(2).padStart(bits, "0");
  }
  const posBin = Math.abs(num).toString(2).padStart(bits, "0");
  return getTwosComplementStr(posBin);
};

export const intToSM = (num, bits) => {
  const sign = num < 0 ? "1" : "0";
  const magnitude = Math.abs(num).toString(2).padStart(bits - 1, "0");
  return sign + magnitude;
};

export const c2ToInt = (binStr) => {
  if (!binStr) return 0;
  if (binStr[0] === "0") {
    return parseInt(binStr, 2);
  }
  return -parseInt(getTwosComplementStr(binStr), 2);
};

export const smToInt = (bin) => {
  if (!bin) return 0;
  const sign = bin[0] === "1" ? -1 : 1;
  const magnitude = parseInt(bin.slice(1) || "0", 2);
  return sign * magnitude;
};

export const gcd = (a, b) => {
  let x = Math.abs(a);
  let y = Math.abs(b);

  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }

  return x || 1;
};

export const getOvr = (aStr, bStr, sumStr) => {
  const aMsb = aStr[0];
  const bMsb = bStr[0];
  const sumMsb = sumStr[0];
  return aMsb === bMsb && sumMsb !== aMsb ? "1" : "0";
};

export const getCountStr = (count, maxCount) => {
  const safeMaxCount = Math.max(0, maxCount);
  const safeCount = Math.max(0, count);
  const countBits = Math.max(1, safeMaxCount.toString(2).length);
  return safeCount.toString(2).padStart(countBits, "0");
};

export const scaleFractionToFixedInt = (num, den, fracBits) => {
  const safeDen = Math.max(1, den);
  return Math.round((num * 2 ** fracBits) / safeDen);
};

export const getFractionalData = (num, den, fracBits, totalBits) => {
  const scaledNum = scaleFractionToFixedInt(num, den, fracBits);
  return {
    scaledNum,
    sm: intToSM(scaledNum, totalBits),
    c2: intToC2(scaledNum, totalBits),
  };
};

export const getSmToC2Explanation = (num, bits) => {
  const sm = intToSM(num, bits);
  const c2 = intToC2(num, bits);

  if (num >= 0) {
    return {
      sm,
      positiveFull: num.toString(2).padStart(bits, "0"),
      inverted: null,
      plusOne: null,
      c2,
      rule: "positive => SM = C2",
    };
  }

  const positiveFull = Math.abs(num).toString(2).padStart(bits, "0");
  const inverted = invertBits(positiveFull);
  const plusOne = addBinaryStr(inverted, "1".padStart(bits, "0")).result;

  return {
    sm,
    positiveFull,
    inverted,
    plusOne,
    c2,
    rule: "negative => take |x| on full width, invert, then +1",
  };
};

export const groupBits = (bin, size = 4) => {
  if (!bin) return "";
  const out = [];
  for (let i = 0; i < bin.length; i++) {
    out.push(bin[i]);
    const remaining = bin.length - i - 1;
    if (remaining > 0 && remaining % size === 0) out.push(" ");
  }
  return out.join("");
};

export const isPowerOfTwo = (n) => n > 0 && (n & (n - 1)) === 0;

export const formatFraction = (num, den) => {
  if (den === 0) return "undefined";
  const g = gcd(num, den);
  return `${num / g}/${den / g}`;
};

export const decodeFixedPoint = (c2Str, fracBits) => {
  const raw = c2ToInt(c2Str);
  const denom = 2 ** fracBits;
  return {
    raw,
    fraction: formatFraction(raw, denom),
    decimal: raw / denom,
  };
};
