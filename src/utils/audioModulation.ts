/**
 * Audio Recording and Pitch Modulation Engine
 * Uses Web Audio API & OfflineAudioContext to apply pitch shift effects:
 * - 'normal': 1.0x pitch
 * - 'high': 1.48x pitch (Tono Alto)
 * - 'low': 0.72x pitch (Tono Basso)
 * Encodes directly into standard 16-bit PCM WAV (lossless & native support on iOS/Android).
 */

import type { AudioPitchEffect } from '../types';

// Convert Web Audio AudioBuffer to a standard 16-bit PCM WAV Blob
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  let interleaved: Float32Array;
  if (numChannels === 2) {
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    interleaved = new Float32Array(left.length + right.length);
    let idx = 0;
    for (let i = 0; i < left.length; i++) {
      interleaved[idx++] = left[i];
      interleaved[idx++] = right[i];
    }
  } else {
    interleaved = buffer.getChannelData(0);
  }

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = interleaved.length * bytesPerSample;
  const bufferSize = 44 + dataSize;
  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  // RIFF Chunk
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt Sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // subchunk1 size
  view.setUint16(20, format, true); // audio format PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // byte rate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data Sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM Samples
  let offset = 44;
  for (let i = 0; i < interleaved.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, interleaved[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Convert Blob to Base64 Data URL
export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

// Apply Pitch Modulation using OfflineAudioContext
export async function applyPitchModulation(
  rawBlob: Blob,
  effect: AudioPitchEffect
): Promise<{ wavBlob: Blob; dataUrl: string; duration: number }> {
  const arrayBuffer = await rawBlob.arrayBuffer();

  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const tempCtx = new AudioContextClass();
  const decodedBuffer = await tempCtx.decodeAudioData(arrayBuffer);
  await tempCtx.close().catch(() => {});

  if (effect === 'normal') {
    const wav = audioBufferToWavBlob(decodedBuffer);
    const dataUrl = await blobToDataURL(wav);
    return { wavBlob: wav, dataUrl, duration: decodedBuffer.duration };
  }

  // Pitch multiplier
  // High pitch: 1.48x (acuto)
  // Low pitch: 0.72x (profondo)
  const playbackRate = effect === 'high' ? 1.48 : 0.72;
  const newDuration = decodedBuffer.duration / playbackRate;
  const sampleRate = decodedBuffer.sampleRate;
  const newLength = Math.ceil(newDuration * sampleRate);

  const OfflineCtxClass = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  const offlineCtx = new OfflineCtxClass(
    decodedBuffer.numberOfChannels,
    newLength,
    sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = decodedBuffer;
  source.playbackRate.value = playbackRate;

  // Add subtle EQ boost for warmth
  if (effect === 'low') {
    const biquad = offlineCtx.createBiquadFilter();
    biquad.type = 'lowshelf';
    biquad.frequency.value = 350;
    biquad.gain.value = 4.5;
    source.connect(biquad);
    biquad.connect(offlineCtx.destination);
  } else {
    const biquad = offlineCtx.createBiquadFilter();
    biquad.type = 'highshelf';
    biquad.frequency.value = 2500;
    biquad.gain.value = 3.0;
    source.connect(biquad);
    biquad.connect(offlineCtx.destination);
  }

  source.start(0);

  const renderedBuffer = await offlineCtx.startRendering();
  const wavBlob = audioBufferToWavBlob(renderedBuffer);
  const dataUrl = await blobToDataURL(wavBlob);

  return {
    wavBlob,
    dataUrl,
    duration: renderedBuffer.duration,
  };
}
