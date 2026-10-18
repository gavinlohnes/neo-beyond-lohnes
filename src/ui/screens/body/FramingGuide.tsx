import { useEffect, useRef, useState } from "react";
import { PHOTO_POSES, type PhotoPose, type ProgressPhoto } from "../../../domain/body/types";

const poseLabel = (pose: PhotoPose) => pose.charAt(0) + pose.slice(1).toLowerCase();

/** The guide's frame, width over height. Matches `.framing-guide__frame` in bodyProgress.css. */
export const FRAME_ASPECT = 3 / 4;

/**
 * The centered part of a width × height frame that `object-fit: cover` shows
 * at FRAME_ASPECT, so CAPTURE keeps exactly what the operator lined up.
 */
export function coverCrop(width: number, height: number, aspect = FRAME_ASPECT) {
  const sw = Math.min(width, height * aspect);
  const sh = Math.min(height, width / aspect);
  return { sx: (width - sw) / 2, sy: (height - sh) / 2, sw, sh };
}

/**
 * REVIEW-001 Phase 1a, optional framing guide: a live in-app camera with the
 * last visible same-pose photo as a faint ghost, so progress photos line up.
 * Uses only the browser's own camera API. The frame stays on this device:
 * CAPTURE hands it to the existing preview / pose / date / SAVE flow, which
 * re-encodes it and strips metadata like every other photo. Nothing is saved
 * here, and the camera stops when the guide closes.
 */
export function FramingGuide({ initialPose, photos, onCapture, onClose }: {
  initialPose: PhotoPose;
  /** Visible photos, oldest first; the latest in the chosen pose is the ghost. */
  photos: readonly ProgressPhoto[];
  onCapture: (file: File, pose: PhotoPose) => void;
  onClose: () => void;
}) {
  const [pose, setPose] = useState<PhotoPose>(initialPose);
  const ghost = photos.filter((photo) => photo.pose === pose && !photo.hiddenAt).at(-1);
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<"STARTING" | "LIVE" | "UNAVAILABLE">("STARTING");
  const [ghostUrl, setGhostUrl] = useState<string | null>(null);
  const [showGhost, setShowGhost] = useState(true);

  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);

  useEffect(() => {
    if (!ghost) { setGhostUrl(null); return; }
    const url = URL.createObjectURL(ghost.image);
    setGhostUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [ghost]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let alive = true;
    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("No camera API");
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        if (!alive) { stream.getTracks().forEach((track) => track.stop()); return; }
        const element = video.current!;
        element.srcObject = stream;
        await element.play().catch(() => {});
        setState("LIVE");
      } catch {
        if (alive) setState("UNAVAILABLE");
      }
    };
    void start();
    return () => { alive = false; stream?.getTracks().forEach((track) => track.stop()); };
  }, []);

  function capture() {
    const element = video.current;
    if (!element || state !== "LIVE" || !element.videoWidth) return;
    const { sx, sy, sw, sh } = coverCrop(element.videoWidth, element.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(sw);
    canvas.height = Math.round(sh);
    const context = canvas.getContext("2d")!;
    context.drawImage(element, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      onCapture(new File([blob], `progress-${pose.toLowerCase()}.jpg`, { type: "image/jpeg" }), pose);
    }, "image/jpeg", 0.92);
  }

  return (
    <dialog ref={dialog} className="framing-guide" aria-labelledby="framing-guide-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <header className="framing-guide__header">
        <h2 id="framing-guide-title" className="card-title">{poseLabel(pose)} · framing guide</h2>
        <button type="button" className="chip" onClick={onClose}>CLOSE</button>
      </header>
      <div className="framing-guide__poses" role="group" aria-label="Pose">
        {PHOTO_POSES.map((key) => <button key={key} type="button" className={`chip${key === pose ? " chip--selected" : ""}`} aria-pressed={key === pose} onClick={() => setPose(key)}>{poseLabel(key).toUpperCase()}</button>)}
      </div>
      <div className="framing-guide__frame">
        <video ref={video} className="framing-guide__video" playsInline muted aria-label={`Live camera, ${poseLabel(pose).toLowerCase()} pose`} />
        {ghostUrl && showGhost && <img className="framing-guide__ghost" src={ghostUrl} alt="" aria-hidden="true" />}
        {state === "STARTING" && <p className="framing-guide__status" role="status">Starting the camera…</p>}
        {state === "UNAVAILABLE" && <p className="framing-guide__status" role="alert">Camera unavailable here. Use TAKE PHOTO or IMPORT PHOTO instead.</p>}
      </div>
      <p className="meta framing-guide__note">
        {ghost ? `Line up with your last ${poseLabel(pose).toLowerCase()} photo. Same distance, same light.` : `No earlier ${poseLabel(pose).toLowerCase()} photo yet. This one becomes the guide next time.`}
        {" "}Nothing saves until you choose SAVE PHOTO.
      </p>
      <div className="framing-guide__actions">
        {ghost && <button type="button" className="btn-secondary" aria-pressed={showGhost} onClick={() => setShowGhost(!showGhost)}>{showGhost ? "HIDE GUIDE" : "SHOW GUIDE"}</button>}
        <button type="button" className="btn-primary" disabled={state !== "LIVE"} onClick={capture}>CAPTURE</button>
      </div>
    </dialog>
  );
}
