'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

export type RecordingStatus = 'idle' | 'requesting' | 'recording' | 'paused' | 'processing' | 'done' | 'error'

function getMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm'
  if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4'
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus'
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
  return 'audio/ogg'
}

export function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function useMeetingRecorder() {
  const [status, setStatus] = useState<RecordingStatus>('idle')
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const audioChunks = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const pausedDurationRef = useRef<number>(0)

  const startRecording = useCallback(async () => {
    setStatus('requesting')
    setError(null)
    setDuration(0)
    pausedDurationRef.current = 0

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000, channelCount: 1 },
      })

      const mimeType = getMimeType()
      const recorder = new MediaRecorder(stream, { mimeType })

      audioChunks.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data)
      }

      recorder.onerror = () => {
        setError('Recording error. Try again.')
        setStatus('error')
      }

      recorder.start(10000)
      mediaRecorder.current = recorder
      startTimeRef.current = Date.now()
      setStatus('recording')

      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current + pausedDurationRef.current) / 1000))
      }, 1000)
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow microphone access in your browser settings.')
      } else {
        setError('Could not start recording. ' + err.message)
      }
      setStatus('error')
    }
  }, [])

  const pauseRecording = useCallback(() => {
    if (mediaRecorder.current?.state === 'recording') {
      mediaRecorder.current.pause()
      pausedDurationRef.current += Date.now() - startTimeRef.current
      setStatus('paused')
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const resumeRecording = useCallback(() => {
    if (mediaRecorder.current?.state === 'paused') {
      startTimeRef.current = Date.now()
      mediaRecorder.current.resume()
      setStatus('recording')
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current + pausedDurationRef.current) / 1000))
      }, 1000)
    }
  }, [])

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      if (!mediaRecorder.current) return resolve(new Blob())

      mediaRecorder.current.onstop = () => {
        const mimeType = getMimeType()
        const blob = new Blob(audioChunks.current, { type: mimeType })
        mediaRecorder.current?.stream.getTracks().forEach(t => t.stop())
        if (timerRef.current) clearInterval(timerRef.current)
        resolve(blob)
      }

      if (mediaRecorder.current.state !== 'inactive') {
        mediaRecorder.current.stop()
      } else {
        resolve(new Blob())
      }
      setStatus('processing')
    })
  }, [])

  const reset = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    mediaRecorder.current?.stream?.getTracks()?.forEach(t => t.stop())
    mediaRecorder.current = null
    audioChunks.current = []
    setStatus('idle')
    setDuration(0)
    setError(null)
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      mediaRecorder.current?.stream?.getTracks()?.forEach(t => t.stop())
    }
  }, [])

  return {
    status,
    duration,
    formattedDuration: formatDuration(duration),
    error,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    reset,
  }
}
