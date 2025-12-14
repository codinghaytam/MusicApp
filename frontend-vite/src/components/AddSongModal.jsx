import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog'
import { Button } from './ui/button'
import { useSongs } from '../state/SongsProvider'
import {
  normalizeSongDocument,
  normalizeEmotionArray,
  getEmotionFallback,
} from '../lib/emotionLabels'

const API_BASE = 'http://localhost:8000/api'
const EMOTION_FALLBACK = getEmotionFallback()

export default function AddSongModal({ open, onOpenChange }) {
  const { addSong } = useSongs()
  const [file, setFile] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [analysisSummary, setAnalysisSummary] = useState(null)
  const [metadata, setMetadata] = useState({ title: '', artist: '', album: '', genre: '' })

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/mp4', 'audio/x-m4a']
    const matchesExt = /\.(mp3|wav|mp4|m4a)$/i.test(selectedFile.name)
    if (!validTypes.includes(selectedFile.type) && !matchesExt) {
      setError('Veuillez sélectionner un fichier audio valide (MP3, WAV, MP4)')
      setFile(null)
      setAnalysisSummary(null)
      return
    }
    setFile(selectedFile)
    setError('')
    setAnalysisSummary(null)
  }

  useEffect(() => {
    if (!open) {
      setFile(null)
      setAnalysisSummary(null)
      setError('')
      setMetadata({ title: '', artist: '', album: '', genre: '' })
    }
  }, [open])

  const handleMetadataChange = (field) => (event) => {
    const value = event.target.value
    setMetadata((prev) => ({ ...prev, [field]: value }))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!file) {
      setError('Veuillez sélectionner un fichier audio')
      return
    }

    setAnalyzing(true)
    setError('')
    setAnalysisSummary(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const analyzeResponse = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        body: formData,
      })
      if (!analyzeResponse.ok) {
        throw new Error("Échec de l'analyse du fichier audio")
      }
      const analysisData = await analyzeResponse.json()
      const normalizedAnalysis = normalizeSongDocument(analysisData)
      const normalizedEmotions = normalizeEmotionArray(
        normalizedAnalysis.primaryEmotions || normalizedAnalysis.emotions || []
      )
      setAnalysisSummary({
        emotions: normalizedEmotions.slice(0, 3),
        transcription: normalizedAnalysis.transcription || '',
      })

      const mergedPayload = {
        ...normalizedAnalysis,
        title: metadata.title.trim() || normalizedAnalysis.title || file.name || 'Sans titre',
        artist: metadata.artist.trim() || normalizedAnalysis.artist || '',
        album: metadata.album.trim() || normalizedAnalysis.album || '',
        genre: metadata.genre.trim() || normalizedAnalysis.genre || '',
        trackId: normalizedAnalysis.trackId || undefined,
        duration: normalizedAnalysis.duration,
        bitRate: normalizedAnalysis.bitRate,
      }

      const result = await addSong(mergedPayload)
      if (!result.success) {
        throw new Error(result.error || 'Échec de la sauvegarde')
      }

      onOpenChange(false)
      setFile(null)
      setError('')
      setAnalysisSummary(null)
      setMetadata({ title: '', artist: '', album: '', genre: '' })
      window.setTimeout(() => {
        const labels = normalizedEmotions.slice(0, 3).join(', ') || EMOTION_FALLBACK
        window.alert(`Chanson ajoutée avec succès!\nÉmotions: ${labels}`)
      }, 100)
    } catch (err) {
      console.error('Error adding song:', err)
      setError(err.message || "Une erreur est survenue lors de l'ajout de la chanson")
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajouter une chanson</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Fichier Audio *</label>
            <input
              type="file"
              accept="audio/*,.mp3,.wav,.mp4,.m4a"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium"
              onChange={handleFileChange}
              required
              disabled={analyzing}
            />
            <p className="text-xs text-muted-foreground">Formats acceptés: MP3, WAV, MP4</p>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Titre</label>
            <input
              type="text"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
              value={metadata.title}
              onChange={handleMetadataChange('title')}
              placeholder="Sans titre"
              disabled={analyzing}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Artiste</label>
            <input
              type="text"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
              value={metadata.artist}
              onChange={handleMetadataChange('artist')}
              placeholder="Anonyme"
              disabled={analyzing}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Album</label>
            <input
              type="text"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
              value={metadata.album}
              onChange={handleMetadataChange('album')}
              placeholder="Album"
              disabled={analyzing}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Genre</label>
            <input
              type="text"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
              value={metadata.genre}
              onChange={handleMetadataChange('genre')}
              placeholder="Genre"
              disabled={analyzing}
            />
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          {analysisSummary && (
            <div className="text-sm rounded border border-gray-200 bg-gray-50 p-3 space-y-1">
              <p className="font-medium">Prévisualisation de l'analyse</p>
              <p>Émotions dominantes: {analysisSummary.emotions.length ? analysisSummary.emotions.join(', ') : 'Aucune'}</p>
              {analysisSummary.transcription && (
                <p className="text-xs italic text-gray-500">
                  "{analysisSummary.transcription.slice(0, 120)}"
                  {analysisSummary.transcription.length > 120 ? '…' : ''}
                </p>
              )}
            </div>
          )}

          {analyzing && (
            <div className="text-sm text-blue-500 bg-blue-50 p-2 rounded">
              Analyse en cours... Cela peut prendre quelques secondes.
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={analyzing}>
              Annuler
            </Button>
            <Button type="submit" variant="default" disabled={!file || analyzing}>
              {analyzing ? 'Analyse...' : 'Analyser et Ajouter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

