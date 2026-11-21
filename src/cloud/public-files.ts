import { uploadTemporaryFile } from "../modules/link-chat/temporary-file-host";
import { uploadDurableFile } from "../modules/link-chat/durable-file-host";
import {
  playlistAudioExtension, roomAudioExtension, prepareLocalImage,
  MAX_LOCAL_ROOM_AUDIO_BYTES, MAX_PREPARED_IMAGE_BYTES,
  type LitterboxRetention, type PreparedLocalImage, type UploadProgress,
} from "../modules/link-chat/image-upload";

const MAX_SHARED_PLAYLIST_AUDIO_BYTES = 80 * 1024 ** 2;
type Retention = LitterboxRetention | "durable";
type Progress = (progress: UploadProgress) => void;

export const prepareSharedImage = prepareLocalImage;

export function uploadSharedImage(image: PreparedLocalImage, retention: Retention, progress?: Progress, signal?: AbortSignal): Promise<string> {
  if (image.blob.type !== "image/webp" || !image.blob.size || image.blob.size > MAX_PREPARED_IMAGE_BYTES)
    return Promise.reject(new Error("Choose a prepared WebP image up to 8 MB."));
  return upload(image.blob, "webp", retention, progress, signal);
}

export function uploadSharedAudio(file: File, retention: Retention, progress?: Progress, signal?: AbortSignal): Promise<string> {
  const extension = retention === "durable" ? playlistAudioExtension(file) : roomAudioExtension(file);
  const format = extension === "oga" || extension === "opus" ? "ogg" : extension;
  if (!format) return Promise.reject(new Error(retention === "durable"
    ? "Choose an MP3, MP4, M4A, OGG, WAV, FLAC, AAC, or WebM track."
    : "Bondage Club room music must be an MP3 or MP4 file."));
  const maxBytes = retention === "durable" ? MAX_SHARED_PLAYLIST_AUDIO_BYTES : MAX_LOCAL_ROOM_AUDIO_BYTES;
  if (!file.size || file.size > maxBytes) return Promise.reject(new Error(`Choose a non-empty audio file up to ${maxBytes / 1024 ** 2} MB.`));
  return upload(file, format, retention, progress, signal);
}

function upload(file: Blob, format: string, retention: Retention, progress?: Progress, signal?: AbortSignal): Promise<string> {
  if (signal?.aborted) return Promise.reject(new DOMException("The upload was cancelled.", "AbortError"));
  if (retention === "durable") return uploadDurableFile(file, format, progress, signal);
  return uploadTemporaryFile(file, format, retention, progress, signal);
}
