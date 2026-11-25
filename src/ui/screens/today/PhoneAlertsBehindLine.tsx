import { useEffect, useState } from "react";
import { useReportPresence } from "../../components/usePresence";
import {
  helperPlanUrl, markPlanLineTapped, onShiftNow, phoneAlertsBehindDue, planBehind, readBridgePlanSettings, readPlanLineDay,
  readPlanSent, type BridgePlan,
} from "../../../application/bridgePlan";
import { bridgeUpdateFallback, currentBridgePlan, isAndroidDevice, sendPlanToPhone } from "../../bridgeHandoff";
import "../more/phoneAlerts.css";

/**
 * GRAYSON-PLAN-FRESH-001 (C7.2): when the plan changed since it was last handed to the phone and nothing else has
 * handed it over, one muted line: "Phone alerts are behind your plan. UPDATE ALERTS". Android only, never inside a
 * shift, at most once a lived day, and off with its switch (KEY MOMENT ALERTS or MORE → TODAY, one switch). A TODAY
 * quiet line (PHONE_ALERTS_BEHIND): it tells TODAY when it has something, and stays out of sight while tucked.
 */
export function PhoneAlertsBehindLine({ now, tucked = false, onPresence }: { now: Date; tucked?: boolean; onPresence?: (shown: boolean) => void }) {
  const [plan, setPlan] = useState<BridgePlan | null>(null);
  const [onShift, setOnShift] = useState(true);
  const [tick, setTick] = useState(0);
  const android = isAndroidDevice();
  const minute = Math.floor(now.getTime() / 60_000);
  useEffect(() => {
    if (!android || !readBridgePlanSettings().showBehind) { setPlan(null); return; }
    let live = true;
    void Promise.all([currentBridgePlan(), onShiftNow()]).then(([p, shift]) => { if (live) { setPlan(p); setOnShift(shift); } }, () => { if (live) setPlan(null); });
    return () => { live = false; };
  }, [android, minute, tick]);
  const due = !!plan && phoneAlertsBehindDue({
    android, on: readBridgePlanSettings().showBehind, behind: planBehind(plan, readPlanSent()), onShift, lineDay: readPlanLineDay(), now: new Date(),
  });
  useReportPresence(due, onPresence);
  if (!due || tucked || !plan) return null;
  return <p className="today-phone-behind" data-phone-behind>
    <span>Phone alerts are behind your plan.</span>
    <a className="phone-alerts__update" href={helperPlanUrl(plan, bridgeUpdateFallback())}
      onClick={(e) => { e.preventDefault(); markPlanLineTapped(); sendPlanToPhone(plan); setTick((n) => n + 1); }}>UPDATE ALERTS</a>
  </p>;
}
