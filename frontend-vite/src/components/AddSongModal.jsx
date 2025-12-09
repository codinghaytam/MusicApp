import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useSongs } from '@/state/SongsProvider'

export default function AddSongModal({ open, onOpenChange }) {
  const { addSong } = useSongs()
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [album, setAlbum] = useState('')

  const submit = (e) => {
    e.preventDefault()
    const created = addSong({ title, artist, album })
    onOpenChange(false)
    setTitle(''); setArtist(''); setAlbum('')
    // Basic toast substitute
    window.setTimeout(() => {
      window.alert(`Song added: ${created.title} by ${created.artist}`)
    }, 0)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* The trigger is controlled externally from Header/App */}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajouter un titre</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Titre</label>
            <input
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground"
              placeholder="Titre"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Artiste</label>
            <input
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground"
              placeholder="Artiste"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Album (optionnel)</label>
            <input
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground"
              placeholder="Album"
              value={album}
              onChange={(e) => setAlbum(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" variant="default">Ajouter</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

