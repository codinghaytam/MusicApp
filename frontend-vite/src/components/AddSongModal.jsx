import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from './ui/dialog'
import { Button } from './ui/button'
import { useSongs } from '../state/SongsProvider'

const API_BASE = 'http://localhost:3000/api';
const EMOTION_LABEL_MAP = {
  anger: 'Anger',
  angry: 'Anger',
  disgust: 'Disgust',
  fear: 'Fear',
  fearful: 'Fear',
  joy: 'Joy',
  joyful: 'Joy',
  sadness: 'Sadness',
  sad: 'Sadness',
  surprise: 'Surprise',
  surprised: 'Surprise',
};

function formatEmotionLabel(label) {
  if (!label) return '';
  const cleaned = label.replace(/_/g, ' ').trim().toLowerCase();
  return EMOTION_LABEL_MAP[cleaned] || label.trim();
}

export default function AddSongModal({ open, onOpenChange }) {
  const { addSong } = useSongs()
  const [file, setFile] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [analysisSummary, setAnalysisSummary] = useState(null)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      // Check if it's an audio file
      const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/mp4', 'audio/x-m4a']
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(mp3|wav|mp4|m4a)$/i)) {
        setError('Veuillez sélectionner un fichier audio valide (MP3, WAV, MP4)')
        setFile(null)
        setAnalysisSummary(null)
        return
      }
      setFile(selectedFile)
      setError('')
      setAnalysisSummary(null)
    }
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
      // Step 1: Analyze the audio file
      const formData = new FormData()
      formData.append('file', file)

      const analyzeResponse = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        body: formData,
      })

      if (!analyzeResponse.ok) {
        throw new Error('Échec de l\'analyse du fichier audio')
      }

      const analysisData = await analyzeResponse.json()
      const normalizedEmotions = (analysisData.primaryEmotions || []).map(formatEmotionLabel)
      setAnalysisSummary({
        emotions: normalizedEmotions.slice(0, 3),
        confidence: analysisData.confidence || 0,
        transcription: analysisData.transcription || '',
      })
      
      // Step 2: Save the analyzed data to Elasticsearch
      const result = await addSong(analysisData)
      
      if (result.success) {
        onOpenChange(false)
        setFile(null)
        setError('')
        setAnalysisSummary(null)
        // Show success message
        window.setTimeout(() => {
          const labels = normalizedEmotions.slice(0, 3).join(', ') || 'instrumental';
          window.alert(`Chanson ajoutée avec succès!\nÉmotions: ${labels}\nConfiance: ${analysisData.confidence || 0}%`)
        }, 100)
      } else {
        throw new Error(result.error || 'Échec de la sauvegarde')
      }

    } catch (err) {
      console.error('Error adding song:', err)
      setError(err.message || 'Une erreur est survenue lors de l\'ajout de la chanson')
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
            <p className="text-xs text-muted-foreground">
              Formats acceptés: MP3, WAV, MP4
            </p>
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
              <p>Confiance: {analysisSummary.confidence}%</p>
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
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={analyzing}
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              variant="default"
              disabled={!file || analyzing}
            >
              {analyzing ? 'Analyse...' : 'Analyser et Ajouter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

