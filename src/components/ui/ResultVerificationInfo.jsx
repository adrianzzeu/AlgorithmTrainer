import React from 'react';
import HoverInfo from './HoverInfo';
import { getC2ToValueExplanation } from '../../utils/binaryHelpers';

export default function ResultVerificationInfo({
  binary,
  scalePower = 0,
  align = 'right',
}) {
  const info = getC2ToValueExplanation(binary, scalePower);

  if (!info) return null;

  return (
    <HoverInfo title="How To Verify This Result" align={align}>
      <div className="space-y-2">
        <div>
          Read the highlighted product as <span className="font-semibold">two&apos;s complement</span>.
        </div>

        <div className="font-mono break-all rounded bg-slate-100 px-2 py-1 dark:bg-slate-950/70">
          bits = {info.binStr}
        </div>

        <div>
          Sign bit = <span className="font-mono">{info.signBit}</span> so the value is{' '}
          <span className="font-semibold">{info.isNegative ? 'negative' : 'positive'}</span>.
        </div>

        {info.isNegative ? (
          <>
            <div>
              Invert the bits:
              <div className="mt-1 font-mono break-all rounded bg-slate-100 px-2 py-1 dark:bg-slate-950/70">
                {info.inverted}
              </div>
            </div>
            <div>
              Add 1:
              <div className="mt-1 font-mono break-all rounded bg-slate-100 px-2 py-1 dark:bg-slate-950/70">
                {info.plusOne}
              </div>
            </div>
            <div>
              Magnitude = <span className="font-semibold">{info.magnitude}</span>, so the signed integer is{' '}
              <span className="font-semibold">-{info.magnitude}</span>.
            </div>
          </>
        ) : (
          <div>
            Read it directly as unsigned: <span className="font-semibold">{info.unsignedValue}</span>.
          </div>
        )}

        {info.scalePower > 0 ? (
          <>
            <div>
              Product scaling = <span className="font-mono">2^{info.scalePower}</span> ={' '}
              <span className="font-semibold">{info.scaleDenom}</span>.
            </div>
            <div>
              Final value = <span className="font-semibold">{info.raw}</span> /{' '}
              <span className="font-semibold">{info.scaleDenom}</span> ={' '}
              <span className="font-semibold">{info.fractionText}</span> = about{' '}
              <span className="font-semibold">{info.decimal.toFixed(6)}</span>.
            </div>
          </>
        ) : (
          <div>
            Final value = <span className="font-semibold">{info.raw}</span>.
          </div>
        )}
      </div>
    </HoverInfo>
  );
}

