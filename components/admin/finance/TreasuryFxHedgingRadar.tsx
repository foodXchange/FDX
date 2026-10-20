"use client";

import { useState } from "react";

interface Props {
  totalGmvEur: number;
  totalBrokerCommissionEur: number;
  pendingBalanceEur: number;
  onCurrencyToggle?: (currency: "EUR" | "ILS", fxRate: number) => void;
}

export default function TreasuryFxHedgingRadar({
  totalGmvEur,
  totalBrokerCommissionEur,
  pendingBalanceEur,
  onCurrencyToggle,
}: Props) {
  // Bank of Israel base rate (ILS per 1 EUR)
  const [fxRate, setFxRate] = useState<number>(4.085);
  const [currencyMode, setCurrencyMode] = useState<"EUR" | "ILS">("EUR");
  const [isOpen, setIsOpen] = useState<boolean>(true);

  // Calculations
  const gmvIls = totalGmvEur * fxRate;
  const brokerFeeIls = totalBrokerCommissionEur * fxRate;
  const pendingBalanceIls = pendingBalanceEur * fxRate;

  // Sensitivity Matrix (+/- 2% and +/- 5%)
  const scenarios = [
    { label: "+5% Shekel Surge (₪" + (fxRate * 0.95).toFixed(3) + ")", rate: fxRate * 0.95, diffPercent: -5 },
    { label: "+2% Shekel Gain (₪" + (fxRate * 0.98).toFixed(3) + ")", rate: fxRate * 0.98, diffPercent: -2 },
    { label: "Base BOI Rate (₪" + fxRate.toFixed(3) + ")", rate: fxRate, diffPercent: 0 },
    { label: "-2% Euro Gain (₪" + (fxRate * 1.02).toFixed(3) + ")", rate: fxRate * 1.02, diffPercent: 2 },
    { label: "-5% Euro Surge (₪" + (fxRate * 1.05).toFixed(3) + ")", rate: fxRate * 1.05, diffPercent: 5 },
  ];

  const handleRateChange = (delta: number) => {
    const next = Number((fxRate + delta).toFixed(3));
    if (next > 2.5 && next < 6.0) {
      setFxRate(next);
      if (onCurrencyToggle) onCurrencyToggle(currencyMode, next);
    }
  };

  const handleToggleCurrency = (mode: "EUR" | "ILS") => {
    setCurrencyMode(mode);
    if (onCurrencyToggle) onCurrencyToggle(mode, fxRate);
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 border border-indigo-900/40 rounded-2xl p-5 text-white shadow-md space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-lg border border-indigo-500/30">
            💱
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                Bank of Israel Feed
              </span>
              <span className="text-xs text-slate-400 font-mono">EUR / ILS Hedging Radar</span>
            </div>
            <h2 className="text-base font-extrabold text-white mt-0.5">
              מדד חשיפת מטבע וגידור שער אירו / שקל
            </h2>
          </div>
        </div>

        {/* Currency Switcher Buttons */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-800 p-1 border border-slate-700 text-xs font-semibold">
            <button
              onClick={() => handleToggleCurrency("EUR")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                currencyMode === "EUR"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              € אירו (חוזה מקור)
            </button>
            <button
              onClick={() => handleToggleCurrency("ILS")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                currencyMode === "ILS"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              ₪ שקל (ספרים בישראל)
            </button>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-xs px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
          >
            {isOpen ? "הסתר סימולטור ▴" : "הצג סימולטור ▾"}
          </button>
        </div>
      </div>

      {/* Main Stats Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Rate Controller Card */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>שער חליפין יציג (BOI):</span>
            <span className="text-[10px] text-emerald-400 font-mono">Live</span>
          </div>
          <div className="text-xl font-black text-white font-mono flex items-center justify-between">
            <span>₪{fxRate.toFixed(3)}</span>
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => handleRateChange(-0.02)}
                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-mono cursor-pointer"
                title="Decrease rate by ₪0.02"
              >
                -
              </button>
              <button
                onClick={() => handleRateChange(0.02)}
                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-mono cursor-pointer"
                title="Increase rate by ₪0.02"
              >
                +
              </button>
            </div>
          </div>
          <div className="text-[10px] text-slate-500">1.00 EUR = {fxRate.toFixed(3)} ILS</div>
        </div>

        {/* Total GMV in ILS */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="text-xs text-slate-400">היקף סחר כולל (GMV בשקלים):</div>
          <div className="text-xl font-black text-white font-mono">
            ₪{Math.round(gmvIls).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500">שווי מקור: €{Math.round(totalGmvEur).toLocaleString()}</div>
        </div>

        {/* Broker Commission in ILS */}
        <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-xl p-3.5 space-y-1">
          <div className="text-xs text-emerald-400 font-semibold">עמלת תיווך נקייה בשקלים:</div>
          <div className="text-xl font-black text-emerald-400 font-mono">
            +₪{Math.round(brokerFeeIls).toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-500/80">
            רווח ברוקר מובטח: €{Math.round(totalBrokerCommissionEur).toLocaleString()}
          </div>
        </div>

        {/* Pending 70% Balance at Risk */}
        <div className="bg-amber-950/30 border border-amber-900/50 rounded-xl p-3.5 space-y-1">
          <div className="text-xs text-amber-400 font-semibold">יתרות 70% בסיכון שער:</div>
          <div className="text-xl font-black text-amber-300 font-mono">
            ₪{Math.round(pendingBalanceIls).toLocaleString()}
          </div>
          <div className="text-[10px] text-amber-500/80">תשלום עתידי כנגד B/L: €{Math.round(pendingBalanceEur).toLocaleString()}</div>
        </div>
      </div>

      {/* Expanded Sensitivity & Hedging Matrix */}
      {isOpen && (
        <div className="pt-2 border-t border-slate-800/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-2">
            <span>מטריצת רגישות שער (FX Stress Test) על עמלת התיווך הנקייה של הברוקר:</span>
            <span className="text-indigo-400 font-semibold">
              המלצת גידור: מרווח ביטחון מומלץ של 1.5% בעת תמחור בשקלים
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
            {scenarios.map((sc, idx) => {
              const fee = Math.round(totalBrokerCommissionEur * sc.rate);
              const diffFromBase = Math.round(fee - brokerFeeIls);
              const isBase = sc.diffPercent === 0;

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border text-center space-y-1 ${
                    isBase
                      ? "bg-indigo-950/60 border-indigo-500/60 shadow-md ring-1 ring-indigo-500/40"
                      : "bg-slate-950/40 border-slate-800"
                  }`}
                >
                  <div className={`text-[10px] font-bold ${isBase ? "text-indigo-300" : "text-slate-400"}`}>
                    {sc.label}
                  </div>
                  <div className="text-sm font-black font-mono text-white">
                    ₪{fee.toLocaleString()}
                  </div>
                  <div
                    className={`text-[10px] font-mono ${
                      diffFromBase > 0
                        ? "text-emerald-400"
                        : diffFromBase < 0
                        ? "text-rose-400"
                        : "text-slate-400"
                    }`}
                  >
                    {isBase ? "שער בסיס נוכחי" : (diffFromBase > 0 ? `+₪${diffFromBase}` : `-₪${Math.abs(diffFromBase)}`)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hedging Best Practice Tip */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-slate-300">
            <span className="text-amber-400 text-sm shrink-0">💡</span>
            <div>
              <strong className="text-white">פרוטוקול גידור FoodXchange:</strong> כאשר רשת שיווק ישראלית (כמו שופרסל או ויקטורי) מעוניינת לשלם בשקלים במקום באירו, יש לנעול עסקת פורוורד (Forward Contract) מול הבנק במועד קבלת מקדמת ה-30%, או לקבע מרווח שער ביטחון של ₪0.08 מעל השער היציג להבטחת עמלת התיווך.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
