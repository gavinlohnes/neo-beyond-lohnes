import type { MonthlyReview } from "../../../application/monthlyReviewQueries";
import type { ProgressPhoto } from "../../../domain/body/types";
import { Readout, ReadoutGrid } from "../../components/ReadoutGrid";
import { PhotoImage } from "../body/ProgressPhotos";
import "../body/bodyProgress.css";

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const calendarLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const title = (key: string) => key.charAt(0) + key.slice(1).toLowerCase();
const signed = (n: number, digits: number) => `${n > 0 ? "+" : ""}${n.toFixed(digits)}`;

/**
 * REVIEW-001 monthly review: body composition over the last four weeks, read
 * only. Weight, tape measurements and same-pose photos as recorded — the
 * difference between first and last, never a verdict. Missing stays missing,
 * and each part says how to fill it in from BODY.
 */
export function MonthlyBodyReview({ body }: { body: NonNullable<MonthlyReview["body"]> }) {
  const { weight, measurements, photos } = body;
  return (
    <section className="weekly-dashboard__panel monthly-body" aria-labelledby="monthly-body-heading">
      <h3 id="monthly-body-heading" className="tool-label">BODY COMPOSITION · LAST 4 WEEKS</h3>
      <p className="meta">{calendarLabel(body.fromDate)} – {calendarLabel(body.toDate)}. First and last recorded values. Readings only; you draw the conclusions.</p>
      <ReadoutGrid className="weekly-dashboard__metrics">
        <Readout
          label="WEIGHT"
          value={weight.change === undefined ? "Not enough" : `${signed(weight.change, 1)} lb`}
          detail={weight.change === undefined
            ? `Needs two weighed days (${weight.days})`
            : `${weight.first!.toFixed(1)} lb on ${shortDate(weight.firstDay!)} → ${weight.last!.toFixed(1)} lb on ${shortDate(weight.lastDay!)}`}
        />
        {measurements.map((entry) => (
          <Readout
            key={entry.site}
            label={entry.site}
            value={entry.change === undefined ? `${entry.last.inches} in` : `${signed(entry.change, 2).replace(/\.?0+$/, "")} in`}
            detail={entry.change === undefined
              ? `One measurement, ${calendarLabel(entry.last.measuredOn)}`
              : `${entry.first.inches} in on ${calendarLabel(entry.first.measuredOn)} → ${entry.last.inches} in on ${calendarLabel(entry.last.measuredOn)}`}
          />
        ))}
      </ReadoutGrid>
      {measurements.length === 0 && <p className="card-body">No tape measurements in these four weeks. Waist is the one to start with, in DATA → Progress.</p>}

      <h4 className="tool-label monthly-body__subhead">PHOTOS · SAME POSE</h4>
      {photos.length === 0 ? (
        <p className="card-body">No pair to compare. A comparison needs a photo from these four weeks and an earlier one in the same pose.</p>
      ) : photos.map((pair) => <PhotoPair key={pair.pose} pose={pair.pose} earlier={pair.earlier} later={pair.later} />)}
    </section>
  );
}

function PhotoPair({ pose, earlier, later }: { pose: string; earlier: ProgressPhoto; later: ProgressPhoto }) {
  return (
    <figure className="monthly-body__pair" aria-label={`${title(pose)} photos, ${calendarLabel(earlier.takenOn)} and ${calendarLabel(later.takenOn)}`}>
      <div className="progress-photos">
        <figure><PhotoImage image={earlier.image} alt={`${title(pose)} photo, ${calendarLabel(earlier.takenOn)}`} /><figcaption>{calendarLabel(earlier.takenOn)}</figcaption></figure>
        <figure><PhotoImage image={later.image} alt={`${title(pose)} photo, ${calendarLabel(later.takenOn)}`} /><figcaption>{calendarLabel(later.takenOn)}</figcaption></figure>
      </div>
      <figcaption className="meta">{title(pose)}</figcaption>
    </figure>
  );
}
