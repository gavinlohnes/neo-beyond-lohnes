import { useEffect, useState } from "react";
import {
  helperPlanUrl, planBehind, readBridgePlanSettings, readPlanSent, writeBridgePlanSettings, type BridgePlan, type BridgePlanSettings,
} from "../../../application/bridgePlan";
import { bridgeOutdated, bridgeUpdateFallback, currentBridgePlan, isAndroidDevice, sendPlanToPhone } from "../../bridgeHandoff";
import "./phoneAlerts.css";

/**
 * GRAYSON-PLAN-FRESH-001 (C7.2): in KEY MOMENT ALERTS, how current the phone's plan is, UPDATE ALERTS when it's
 * behind, and his two switches ("I should be able to edit and tweak or correct everything in this app"). Android only:
 * the Bridge is an Android app, so elsewhere none of this shows.
 */
const when = (at: number) => {
  const d = new Date(at);
  return `${d.toLocaleDateString("en-US", { weekday: "short" })} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export function PhoneAlertsCurrency({ refreshKey = 0 }: { refreshKey?: number }) {
  const [plan, setPlan] = useState<BridgePlan | null>(null);
  const [tick, setTick] = useState(0);
  const [settings, setSettings] = useState<BridgePlanSettings>(() => readBridgePlanSettings());
  const android = isAndroidDevice();
  useEffect(() => {
    if (!android) return;
    let live = true;
    void currentBridgePlan().then((p) => { if (live) setPlan(p); }, () => { if (live) setPlan(null); });
    return () => { live = false; };
  }, [android, refreshKey, tick]);
  if (!android) return null;

  const sent = readPlanSent();
  const behind = plan ? planBehind(plan, sent) : false;
  const update = plan
    ? <a className="phone-alerts__update" href={helperPlanUrl(plan, bridgeUpdateFallback())}
        onClick={(e) => { e.preventDefault(); sendPlanToPhone(plan); setTick((n) => n + 1); }}>UPDATE ALERTS</a>
    : null;
  function toggle(key: keyof BridgePlanSettings) {
    const next = { ...settings, [key]: !settings[key] };
    writeBridgePlanSettings(next);
    setSettings(next);
  }
  const SWITCHES: { key: keyof BridgePlanSettings; label: string }[] = [
    { key: "updateOnSave", label: "Update the phone when I save here" },
    { key: "showBehind", label: "Show \"Phone alerts are behind\" on TODAY" },
  ];

  return <div className="card" data-phone-alerts>
    {bridgeOutdated() && <p className="meta" role="status">Update Health Bridge to send alerts without a sync. SYNC GARMIN still works.</p>}
    <p className="meta" data-phone-alerts-status>
      {sent
        ? <>Phone has your plan from {when(sent.at)}.{behind && update && <> Changed since: {update}</>}</>
        : <>The phone gets your plan at the next SYNC GARMIN or {update ?? "UPDATE ALERTS"}.</>}
    </p>
    {SWITCHES.map(({ key, label }) => (
      <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 8 }}>
        <p className="meta" style={{ margin: 0 }}>{label}</p>
        <button type="button" className={`chip ${settings[key] ? "chip--selected" : ""}`} aria-pressed={settings[key]} aria-label={label}
          onClick={() => toggle(key)}>{settings[key] ? "ON" : "OFF"}</button>
      </div>
    ))}
  </div>;
}
