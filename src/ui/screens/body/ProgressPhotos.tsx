import { useEffect, useRef, useState } from "react";
import { addProgressPhoto, correctProgressPhoto, hideProgressPhoto, deleteProgressPhotoPermanently } from "../../../application/progressPhotoCommands";
import { getProgressPhotos, isPhotoStoragePersistent } from "../../../application/progressPhotoQueries";
import { PHOTO_POSES, type PhotoPose, type PhotoSource, type ProgressPhoto } from "../../../domain/body/types";
import { describeError } from "../../errorMessage";
import { useSessionDraft } from "../../sessionDrafts";
import { localProgressDate, progressDate } from "./progressCopy";

const poseLabel = (pose: PhotoPose) => pose.charAt(0) + pose.slice(1).toLowerCase();

/** Object URLs belong only to mounted images, never to records or backup data. */
export function PhotoImage({ image, alt }: { image: Blob; alt: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const next = URL.createObjectURL(image); setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [image]);
  return url ? <img src={url} alt={alt} loading="lazy" /> : null;
}

export function ProgressPhotos({ active }: { active: boolean }) {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [visited, setVisited] = useState(false);
  const [ready, setReady] = useState(false);
  const [reading, setReading] = useState(false);
  const [readFailed, setReadFailed] = useState(false);
  const [persistent, setPersistent] = useState<boolean | null>(null);
  const [revision, setRevision] = useState(0);
  const version = useRef(0);
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState<PhotoSource>("IMPORT");
  const [pose, setPose] = useState<PhotoPose>("FRONT");
  const [date, setDate] = useState(localProgressDate);
  const [filter, setFilter] = useState<PhotoPose>("FRONT");
  const [showHidden, setShowHidden] = useState(false);
  const [limit, setLimit] = useState(12);
  const [compare, setCompare] = useState({ earlier: "", later: "" });
  const [comparing, setComparing] = useState(false);
  const [editing, setEditing] = useState<ProgressPhoto | null>(null);
  const [edit, setEdit] = useState<{ pose: PhotoPose; date: string }>({ pose: "FRONT", date: "" });
  const [confirm, setConfirm] = useState<{ photo: ProgressPhoto; action: "hide" | "delete" } | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const restoreRetryFocus = useRef(false);
  useEffect(() => {
    if (!ready || reading || readFailed || !restoreRetryFocus.current) return;
    restoreRetryFocus.current = false;
    requestAnimationFrame(() => {
      if (document.activeElement === document.body) document.getElementById("photos-heading")?.focus({ preventScroll: true });
    });
  }, [ready, reading, readFailed]);
  const importRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  useSessionDraft("body-progress-photos", file !== null || editing !== null);
  useEffect(() => {
    if (!active) return;
    setVisited(true);
    const current = ++version.current; setReading(true);
    void Promise.all([getProgressPhotos({ includeHidden: true }), isPhotoStoragePersistent()]).then(([rows, retained]) => {
      if (current !== version.current) return;
      setPhotos(rows); setPersistent(retained); setReady(true); setReadFailed(false);
    }).catch(() => { if (current === version.current) setReadFailed(true); })
      .finally(() => { if (current === version.current) setReading(false); });
    return () => { version.current++; };
  }, [active, revision]);
  const matching = photos.filter((photo) => photo.pose === filter && !photo.hiddenAt);
  const timeline = photos.filter((photo) => photo.pose === filter && (showHidden || !photo.hiddenAt)).slice().reverse();
  useEffect(() => { if (matching.length < 2) setComparing(false); }, [matching.length]);
  const earlier = matching.find((photo) => photo.id === compare.earlier) ?? matching[0];
  const later = matching.find((photo) => photo.id === compare.later) ?? matching.at(-1);
  function pick(next: File | undefined, origin: PhotoSource) {
    if (lock.current || !next) return;
    setFile(next); setSource(origin); setError(null); setReceipt(null);
  }
  function clearFile() {
    setFile(null);
    if (importRef.current) importRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  }
  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null); setReceipt(null);
    try { await action(); setRevision((value) => value + 1); }
    catch (cause) { setError(describeError(cause, "Could not save this change. Your input is still here.")); }
    finally { lock.current = false; setBusy(false); }
  }
  function focusManage(id: string) { requestAnimationFrame(() => (document.getElementById(`photo-manage-${id}`) ?? document.getElementById("photo-filter"))?.focus()); }
  if (!visited && !active) return <h3 id="photos-heading" tabIndex={-1} className="progress-section-title">Progress photos</h3>;
  return <>
    <h3 id="photos-heading" tabIndex={-1} className="progress-section-title">Progress photos</h3>
    <p className="meta">Front, side, back. Your visual record, stored on this device.</p>
    <p className="meta">{persistent === true ? "Storage protection is on. Keep backups." : "Browser storage can be cleared. Keep backups."}</p>
    <details className="progress-storage-details"><summary>Photo storage &amp; backups</summary><p className="meta">Photos are included in your normal backup. Location and device metadata are stripped before saving. Browser storage protection cannot prevent device loss or manually cleared data.</p></details>
    <form className="progress-form" aria-label="Save a progress photo" onSubmit={(event) => {
      event.preventDefault();
      if (!file) return;
      void run(async () => {
        await addProgressPhoto(file, { pose, takenOn: date }, source);
        setReceipt(`${poseLabel(pose)} photo saved · ${progressDate(date)}.`); setFilter(pose); clearFile();
        requestAnimationFrame(() => document.getElementById("photo-import-button")?.focus());
      });
    }}>
      <div className="progress-actions">
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => cameraRef.current?.click()}>TAKE PHOTO</button>
        <button id="photo-import-button" type="button" className="btn-secondary" disabled={busy} onClick={() => importRef.current?.click()}>IMPORT PHOTO</button>
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="user" aria-label="Take progress photo" hidden disabled={busy} onChange={(event) => pick(event.target.files?.[0], "CAMERA")} />
      <input ref={importRef} type="file" accept="image/*" aria-label="Import progress photo" hidden disabled={busy} onChange={(event) => pick(event.target.files?.[0], "IMPORT")} />
      {file && <><figure className="progress-preview"><PhotoImage image={file} alt="Selected photo, not yet saved" /><figcaption className="meta">Selected photo · not saved yet</figcaption></figure>
        <div className="progress-fields"><div className="field"><label htmlFor="photo-pose">Photo pose</label><select id="photo-pose" className="input" value={pose} disabled={busy} onChange={(event) => setPose(event.target.value as PhotoPose)}>{PHOTO_POSES.map((key) => <option key={key} value={key}>{poseLabel(key)}</option>)}</select></div>
          <div className="field"><label htmlFor="photo-date">Taken on</label><input id="photo-date" className="input" type="date" required max={localProgressDate()} value={date} disabled={busy} onChange={(event) => setDate(event.target.value)} /></div></div>
        <div className="progress-actions"><button className="btn-primary" disabled={busy}>{busy ? "SAVING…" : "SAVE PHOTO"}</button><button className="btn-secondary" type="button" disabled={busy} onClick={clearFile}>CLEAR SELECTED PHOTO</button></div>
      </>}
    </form>
    {receipt && <p className="progress-receipt" role="status">{receipt}</p>}
    {error && <p role="alert">{error}</p>}
    {readFailed && <div role="alert"><p>Could not read photos. Your stored photos are unchanged.</p><button className="btn-secondary" disabled={reading} onClick={() => { restoreRetryFocus.current = true; setRevision((value) => value + 1); }}>RETRY PHOTOS</button></div>}
    {!ready && !readFailed && <p className="meta" role="status">Reading photos…</p>}
    <div className="field"><label htmlFor="photo-filter">Timeline pose</label><select id="photo-filter" className="input" value={filter} onChange={(event) => { setFilter(event.target.value as PhotoPose); setLimit(12); setCompare({ earlier: "", later: "" }); }}>
      {PHOTO_POSES.map((key) => <option key={key} value={key}>{poseLabel(key)}</option>)}</select></div>
    {ready && !readFailed && <>
      <div className="progress-actions"><button type="button" className="btn-secondary" disabled={matching.length < 2} aria-expanded={comparing} aria-controls="photo-comparison" onClick={() => setComparing(!comparing)}>{comparing ? "CLOSE COMPARISON" : "COMPARE PHOTOS"}</button>
        <button type="button" className="btn-secondary" aria-pressed={showHidden} onClick={() => setShowHidden(!showHidden)}>{showHidden ? "HIDE HIDDEN PHOTOS" : "MANAGE HIDDEN PHOTOS"}</button></div>
      {matching.length < 2 && <p className="meta">Comparison needs two visible {poseLabel(filter).toLowerCase()} photos. No dates or progress are inferred.</p>}
      {comparing && matching.length >= 2 && earlier && later && <section id="photo-comparison" className="progress-compare" aria-label="Same-pose photo comparison">
        <h4>{poseLabel(filter)} comparison</h4>
        <div className="progress-fields"><div><label htmlFor="photo-compare-earlier">First photo</label><select id="photo-compare-earlier" className="input" value={earlier.id} onChange={(event) => setCompare({ ...compare, earlier: event.target.value })}>{matching.map((photo, index) => <option value={photo.id} key={photo.id}>{progressDate(photo.takenOn)} · photo {index + 1}</option>)}</select></div>
          <div><label htmlFor="photo-compare-later">Second photo</label><select id="photo-compare-later" className="input" value={later.id} onChange={(event) => setCompare({ ...compare, later: event.target.value })}>{matching.map((photo, index) => <option value={photo.id} key={photo.id}>{progressDate(photo.takenOn)} · photo {index + 1}</option>)}</select></div></div>
        {earlier.id === later.id && <p className="meta">You selected the same photo twice.</p>}
        <div className="progress-photos"><figure><PhotoImage image={earlier.image} alt={`First ${poseLabel(filter).toLowerCase()} comparison photo`} /><figcaption>{progressDate(earlier.takenOn)}</figcaption></figure><figure><PhotoImage image={later.image} alt={`Second ${poseLabel(filter).toLowerCase()} comparison photo`} /><figcaption>{progressDate(later.takenOn)}</figcaption></figure></div>
      </section>}
      {editing && <form className="progress-form" aria-label="Correct photo details" onSubmit={(event) => { event.preventDefault(); void run(async () => {
        await correctProgressPhoto(editing.id, { pose: edit.pose, takenOn: edit.date });
        setReceipt("Photo details corrected. The image is unchanged."); setFilter(edit.pose); setCompare({ earlier: "", later: "" }); setEditing(null); focusManage(editing.id);
      }); }}>
        <h4>Correct photo details</h4><div className="progress-fields"><div className="field"><label htmlFor="photo-edit-pose">Corrected photo pose</label><select id="photo-edit-pose" className="input" value={edit.pose} disabled={busy} onChange={(event) => setEdit({ ...edit, pose: event.target.value as PhotoPose })}>{PHOTO_POSES.map((key) => <option key={key} value={key}>{poseLabel(key)}</option>)}</select></div>
          <div className="field"><label htmlFor="photo-edit-date">Corrected photo date</label><input id="photo-edit-date" className="input" type="date" required max={localProgressDate()} value={edit.date} disabled={busy} onChange={(event) => setEdit({ ...edit, date: event.target.value })} /></div></div>
        <div className="progress-actions"><button className="btn-primary" disabled={busy}>SAVE PHOTO DETAILS</button><button type="button" className="btn-secondary" disabled={busy} onClick={() => { focusManage(editing.id); setEditing(null); }}>CANCEL PHOTO CORRECTION</button></div>
        <div className="progress-actions">{!editing.hiddenAt && <button type="button" className="btn-secondary" disabled={busy} onClick={() => { setConfirm({ photo: editing, action: "hide" }); requestAnimationFrame(() => document.getElementById("photo-confirm-heading")?.focus()); }}>HIDE PHOTO</button>}
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => { setConfirm({ photo: editing, action: "delete" }); requestAnimationFrame(() => document.getElementById("photo-confirm-heading")?.focus()); }}>DELETE PHOTO PERMANENTLY</button></div>
      </form>}
      {confirm && <section className="progress-confirm" aria-label="Confirm photo change">
        <h4 id="photo-confirm-heading" tabIndex={-1}>{confirm.action === "hide" ? "Hide this photo?" : "Permanently delete this photo?"}</h4>
        <p>{poseLabel(confirm.photo.pose)} · {progressDate(confirm.photo.takenOn)}</p>
        <p className="meta">{confirm.action === "hide" ? "It leaves the timeline and comparisons. The image stays on this device and in backups. You can still find it under Manage hidden photos." : "The image will be removed from this device and future backups. This cannot be undone here. Older exported backups still contain it."}</p>
        <div className="progress-actions"><button className="btn-secondary" disabled={busy} onClick={() => void run(async () => {
          if (confirm.action === "hide") await hideProgressPhoto(confirm.photo.id); else await deleteProgressPhotoPermanently(confirm.photo.id);
          setReceipt(confirm.action === "hide" ? "Photo hidden. It remains in backups." : "Photo deleted from this device. Older backups are unchanged.");
          setEditing(null); setConfirm(null);
          requestAnimationFrame(() => document.getElementById("photo-filter")?.focus());
        })}>{confirm.action === "hide" ? "CONFIRM HIDE" : "CONFIRM PERMANENT DELETE"}</button><button className="btn-secondary" disabled={busy} onClick={() => { setConfirm(null); requestAnimationFrame(() => document.getElementById("photo-edit-pose")?.focus()); }}>KEEP PHOTO</button></div>
      </section>}
      <h4>{poseLabel(filter)} timeline · {timeline.length} {timeline.length === 1 ? "photo" : "photos"}</h4>
      {!timeline.length && <p className="meta">No {poseLabel(filter).toLowerCase()} photos here yet. Take or import a photo to start.</p>}
      <div className="progress-photos">{timeline.slice(0, limit).map((photo, index) => <figure className="progress-photo-card" key={photo.id}>
        <PhotoImage image={photo.image} alt={`${poseLabel(photo.pose)} progress photo taken ${photo.takenOn}${photo.hiddenAt ? ", hidden" : ""}`} />
        <figcaption>{progressDate(photo.takenOn)}{photo.hiddenAt ? " · Hidden" : ""}<span className="meta" style={{ display: "block" }}>{photo.source === "CAMERA" ? "Camera" : "Imported"} · {Math.ceil(photo.byteSize / 1024)} KB</span></figcaption>
        <button id={`photo-manage-${photo.id}`} className="btn-secondary" disabled={busy || editing !== null} aria-label={`Manage ${poseLabel(photo.pose).toLowerCase()} photo ${photo.takenOn} · ${index + 1} of ${timeline.length}`} onClick={() => {
          setEditing(photo); setEdit({ pose: photo.pose, date: photo.takenOn }); setError(null); setConfirm(null);
          requestAnimationFrame(() => document.getElementById("photo-edit-pose")?.focus());
        }}>MANAGE</button>
      </figure>)}</div>
      {timeline.length > limit && <button className="btn-secondary" onClick={() => setLimit((value) => value + 12)}>SHOW MORE PHOTOS</button>}
    </>}
  </>;
}
