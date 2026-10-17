import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/image-compressor";

export type HeroBackground = { image_url: string; overlay_opacity: number };
export const DEFAULT_HERO_IMAGE = "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1920&q=80";
export const DEFAULT_HERO_BACKGROUND: HeroBackground = { image_url: DEFAULT_HERO_IMAGE, overlay_opacity: 80 };
export const HERO_CACHE_KEY = "adis_hero_background";
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

type Props = { open: boolean; onOpenChange: (open: boolean) => void; value: HeroBackground; onSaved: (value: HeroBackground) => void };

const HeroPhotoDialog = ({ open, onOpenChange, value, onSaved }: Props) => {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(value.image_url);
  const [url, setUrl] = useState("");
  const [opacity, setOpacity] = useState(value.overlay_opacity);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setFile(null); setUrl(""); setPreview(value.image_url); setOpacity(value.overlay_opacity); } }, [open, value]);

  const pick = async (picked?: File | null) => {
    if (!picked) return;
    if (!ACCEPTED.includes(picked.type)) { toast({ title: "Unsupported file", description: "Please choose a JPG, PNG or WEBP image.", variant: "destructive" }); return; }
    try {
      const compressed = await compressImage(picked, { maxSizeBytes: 400 * 1024, maxWidthOrHeight: 1920 });
      setFile(compressed); setUrl(""); setPreview(URL.createObjectURL(compressed));
    } catch (e) { toast({ title: "Image problem", description: (e as Error).message, variant: "destructive" }); }
  };

  const persist = async (next: HeroBackground) => {
    const { data: existing, error: readError } = await supabase.from("site_settings").select("id").eq("key", "hero_background").maybeSingle();
    if (readError) throw readError;
    const { error } = existing
      ? await supabase.from("site_settings").update({ value: next }).eq("id", existing.id).select("id").single()
      : await supabase.from("site_settings").insert({ key: "hero_background", value: next }).select("id").single();
    if (error) throw error;
    try { localStorage.setItem(HERO_CACHE_KEY, JSON.stringify(next)); } catch { /* storage full */ }
    onSaved(next);
  };

  const save = async () => {
    setSaving(true);
    try {
      let imageUrl = value.image_url;
      if (file) {
        const path = `hero-backgrounds/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error } = await supabase.storage.from("site-assets").upload(path, file, { contentType: "image/jpeg" });
        if (error) throw error;
        imageUrl = supabase.storage.from("site-assets").getPublicUrl(path).data.publicUrl;
      } else if (url.trim()) {
        if (!/^https:\/\//i.test(url.trim())) throw new Error("Please paste a link starting with https://");
        imageUrl = url.trim();
      }
      await persist({ image_url: imageUrl, overlay_opacity: opacity });
      toast({ title: "Hero photo updated", description: "All visitors will now see the new photo." });
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Could not save", description: (e as Error).message || "Please try again.", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const reset = async () => {
    setSaving(true);
    try { await persist(DEFAULT_HERO_BACKGROUND); toast({ title: "Hero photo reset to default" }); onOpenChange(false); }
    catch (e) { toast({ title: "Could not reset", description: (e as Error).message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const shown = url.trim() || preview;
  const a = opacity / 80;
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Change Hero Photo</DialogTitle><DialogDescription>Upload a photo or paste a link, then adjust how dark the overlay is.</DialogDescription></DialogHeader>
      <div className="relative h-36 overflow-hidden rounded-lg bg-muted">
        <img src={shown} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(23,43,61,${Math.min(1, 0.78 * a)}) 0%, rgba(19,37,53,${Math.min(1, 0.84 * a)}) 100%)` }} />
      </div>
      <button type="button" onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); void pick(e.dataTransfer.files?.[0]); }}
        className={`flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed p-5 text-sm transition ${dragging ? "border-primary bg-primary/5" : "border-border"}`}>
        <Upload className="h-5 w-5 text-primary" /><span className="font-medium">Drag & drop or click to choose</span><span className="text-xs text-muted-foreground">JPG, JPEG, PNG or WEBP</span>
      </button>
      <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
      <div className="space-y-2"><Label htmlFor="hero-url">Or paste an image link</Label><Input id="hero-url" placeholder="https://..." value={url} onChange={(e) => { setUrl(e.target.value); setFile(null); }} /></div>
      <div className="space-y-2"><Label>Overlay darkness: {opacity}%</Label><Slider min={0} max={100} step={1} value={[opacity]} onValueChange={([v]) => setOpacity(v)} /></div>
      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={reset} disabled={saving}>Reset to Default</Button>
        <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}Save & Apply</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
};
export default HeroPhotoDialog;
