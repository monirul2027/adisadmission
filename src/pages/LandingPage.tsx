import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Camera, CalendarDays, CheckCircle2, Download, FileText, GraduationCap, HeartHandshake, MapPin, MessageCircle, Phone, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import QuickStatusTracker from "@/components/QuickStatusTracker";
import DynamicSectionRenderer from "@/components/DynamicSectionRenderer";
import { supabase } from "@/integrations/supabase/client";
import { mergeSiteSettings, siteDefaults, type SiteSettings } from "@/lib/site-content";
import HeroPhotoDialog, { DEFAULT_HERO_BACKGROUND, HERO_CACHE_KEY, type HeroBackground } from "@/components/HeroPhotoDialog";
import { checkAdminPermission } from "@/lib/supabase-helpers";
import { rememberAdmissionDestination, type AdmissionDestination } from "@/lib/auth-flow";

type PageSection = { id: string; title: string; subtitle: string | null; section_type: string; content: unknown; order_index: number };
const text = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const list = (value: unknown): any[] => Array.isArray(value) ? value : [];

const LandingPage = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SiteSettings>(siteDefaults);
  const [sections, setSections] = useState<PageSection[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [canEditSite, setCanEditSite] = useState(false);
  const [heroDialogOpen, setHeroDialogOpen] = useState(false);
  const [heroBg, setHeroBg] = useState<HeroBackground>(() => {
    try { const cached = JSON.parse(localStorage.getItem(HERO_CACHE_KEY) || "null"); if (cached?.image_url) return { ...DEFAULT_HERO_BACKGROUND, ...cached }; } catch { /* ignore */ }
    return DEFAULT_HERO_BACKGROUND;
  });
  const { hero_content: hero, contact_settings: contact, footer_content: footer, admission_info_content: info, features_content: features } = settings;
  const phones = list(contact.phone_numbers).filter((phone): phone is string => typeof phone === "string" && Boolean(phone.trim()));
  const whatsapp = text(contact.whatsapp_number).replace(/\D/g, "");
  const whatsappUrl = whatsapp ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(text(contact.whatsapp_message))}` : "";

  useEffect(() => { void (async () => {
    const [{ data: settingRows }, { data: sectionRows }] = await Promise.all([
      supabase.from("site_settings").select("key, value"),
      supabase.from("site_sections").select("id, title, subtitle, section_type, content, order_index").eq("is_active", true).order("order_index"),
    ]);
    setSettings(mergeSiteSettings(settingRows));
    const heroRow = (settingRows || []).find((row) => row.key === "hero_background")?.value as Partial<HeroBackground> | undefined;
    if (heroRow?.image_url) { const next = { ...DEFAULT_HERO_BACKGROUND, ...heroRow }; setHeroBg(next); try { localStorage.setItem(HERO_CACHE_KEY, JSON.stringify(next)); } catch { /* ignore */ } }
    setSections(sectionRows || []);
  })(); }, []);

  useEffect(() => {
    let active = true;
    const updateRole = async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) => {
      setIsAuthenticated(Boolean(session));
      setCanEditSite(session ? await checkAdminPermission(session.user.id, "can_edit_site") : false);
    };
    void supabase.auth.getSession().then(({ data }) => updateRole(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) void updateRole(session);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  const startApplication = (destination: AdmissionDestination) => {
    if (isAuthenticated) { navigate(destination === "new-admission" ? "/student/new-admission" : "/student/admission-test"); return; }
    rememberAdmissionDestination(destination);
    navigate(`/student/login?destination=${destination}`);
  };
  const trackerScroll = () => document.getElementById("application-status")?.scrollIntoView({ behavior: "smooth", block: "center" });
  const steps = list(hero.journey_steps).filter((step): step is string => typeof step === "string");
  const infoIcons = [CalendarDays, FileText, GraduationCap];
  const featureIcons = [Users, ShieldCheck, CheckCircle2];

  return <div className="min-h-screen bg-background text-foreground">
    <header className="sticky top-0 z-20 bg-background/95 px-0 pt-0 backdrop-blur sm:px-4 sm:pt-3"><div className="mx-auto max-w-6xl overflow-hidden rounded-none border border-border bg-card shadow-sm sm:rounded-2xl">
      <div className="flex items-center gap-3 px-3 py-3 sm:px-5"><img alt="Alor Disha Islamic School logo" className="h-12 w-12 shrink-0 rounded-full border-2 border-primary/15 object-cover sm:h-14 sm:w-14" src="/lovable-uploads/b3369ca5-553a-4c65-961b-27d4deb3ca86.jpg" /><div className="min-w-0"><p className="text-base font-bold leading-tight text-foreground sm:text-xl">Alor Disha Islamic School</p><p className="mt-1 text-xs text-muted-foreground sm:text-sm">Admissions Portal</p></div></div>
      <nav aria-label="Admission application options" className="grid grid-cols-2 gap-3 border-t border-border px-3 py-3 sm:px-5"><button type="button" onClick={() => startApplication("admission-test")} className="retro-btn retro-btn-mint">Admission Test <ArrowRight className="h-4 w-4" strokeWidth={2.5} /></button><button type="button" onClick={() => startApplication("new-admission")} className="retro-btn retro-btn-coral">New Admission <ArrowRight className="h-4 w-4" strokeWidth={2.5} /></button></nav>
    </div></header>
    <main>
      <section className="relative overflow-hidden text-primary-foreground"><div aria-hidden className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url("${heroBg.image_url}")` }} /><div aria-hidden className="absolute inset-0 z-10" style={{ background: `linear-gradient(180deg, rgba(23, 43, 61, ${Math.min(1, 0.78 * heroBg.overlay_opacity / 80)}) 0%, rgba(19, 37, 53, ${Math.min(1, 0.84 * heroBg.overlay_opacity / 80)}) 100%)`, backdropFilter: "contrast(1.05) saturate(0.85)" }} />{canEditSite && <button type="button" onClick={() => setHeroDialogOpen(true)} className="absolute right-3 top-3 z-30 inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-1.5 text-xs font-medium opacity-60 backdrop-blur-sm transition hover:opacity-100"><Camera className="h-3.5 w-3.5" /> Change Hero Photo</button>}<div className="relative z-20 mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-[1.3fr_.7fr] md:py-20"><div className="max-w-2xl">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-1.5 text-sm font-semibold backdrop-blur-sm"><span className="h-2 w-2 rounded-full bg-accent" /> {text(hero.badge_text)}</p><h1 className="text-4xl font-bold leading-tight sm:text-5xl">{text(hero.title)}</h1><p className="mt-5 max-w-xl text-base leading-7 text-primary-foreground/85 sm:text-lg">{text(hero.subtitle)}</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row"><Button size="lg" variant="outline" className="border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground backdrop-blur-sm hover:bg-primary-foreground/20 hover:text-primary-foreground" onClick={trackerScroll}>{text(hero.secondary_btn_text)}</Button></div><p className="mt-5 flex items-center gap-2 text-sm text-primary-foreground/75"><MapPin className="h-4 w-4" /> {text(hero.address)}</p>
      </div><Card className="border-0 bg-card text-card-foreground shadow-2xl"><CardContent className="p-6"><p className="text-sm font-semibold text-primary">Your admission journey</p><ol className="mt-4 space-y-4">{steps.map((step, index) => <li key={`${step}-${index}`} className="flex gap-3 text-sm"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{index + 1}</span><span className="pt-1 font-medium">{step}</span></li>)}</ol><Button className="mt-6 w-full" variant="outline" onClick={trackerScroll}>Check application status</Button></CardContent></Card></div></section>
      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:grid-cols-3 sm:px-6">{[{ icon: FileText, title: "Simple online application", copy: "A clear form with secure document uploads." }, { icon: ShieldCheck, title: "Track your application", copy: "Check a current status without logging in." }, { icon: HeartHandshake, title: "Help when you need it", copy: "Our admissions team is ready to assist." }].map(({ icon: Icon, title, copy }) => <div className="flex gap-3 rounded-xl bg-card p-4 shadow-sm ring-1 ring-border" key={title}><span className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></span><div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{copy}</p></div></div>)}</section>
      <QuickStatusTracker settings={settings.quick_tracker_settings} />
      <section id="admission-info" className="mx-auto max-w-6xl px-4 py-12 sm:px-6"><div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-wider text-primary">{text(info.eyebrow)}</p><h2 className="mt-2 text-3xl font-bold">{text(info.title)}</h2><p className="mt-3 text-muted-foreground">{text(info.subtitle)}</p></div><div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">{list(info.cards).map((card: any, index) => { const Icon = infoIcons[index] || FileText; return <InfoCard key={card.id || `${card.title}-${index}`} icon={Icon} card={card} />; })}</div></section>
      <DynamicSectionRenderer sections={sections} />
      <section className="bg-card py-12"><div className="mx-auto max-w-6xl px-4 sm:px-6"><div className="text-center"><p className="text-sm font-bold uppercase tracking-wider text-primary">{text(features.eyebrow)}</p><h2 className="mt-2 text-3xl font-bold">{text(features.title)}</h2></div><div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">{list(features.cards).map((card: any, index) => { const Icon = featureIcons[index] || CheckCircle2; return <Card key={card.id || `${card.title}-${index}`} className="overflow-hidden border-none bg-muted"><CardContent className="p-0">{card.image_url && <img className="h-44 w-full object-cover" src={card.image_url} alt="" />}<div className="p-6"><Icon className="h-8 w-8 text-primary" /><h3 className="mt-4 font-bold">{card.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{card.description}</p>{card.document_url && <Button asChild className="mt-4" size="sm" variant="outline"><a href={card.document_url} target="_blank" rel="noreferrer"><Download className="mr-2 h-4 w-4" />{card.document_label || "Download"}</a></Button>}</div></CardContent></Card>; })}</div></div></section>
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6"><div className="flex flex-col justify-between gap-6 rounded-2xl bg-accent p-7 text-accent-foreground md:flex-row md:items-center"><div><p className="text-sm font-semibold">{text(contact.helpline_title)}</p><h2 className="mt-1 text-2xl font-bold">{text(contact.helpline_subtitle)}</h2><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">{phones.length ? phones.map((phone) => <a className="inline-flex items-center gap-2 underline-offset-4 hover:underline" href={`tel:${phone.replace(/\s/g, "")}`} key={phone}><Phone className="h-4 w-4" /> {phone}</a>) : <span className="inline-flex items-center gap-2"><Phone className="h-4 w-4" /> Contact the school admissions office for assistance.</span>}</div></div><div className="flex flex-wrap gap-3">{!contact.is_floating_whatsapp && whatsappUrl && <Button asChild variant="secondary"><a href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle className="mr-2 h-4 w-4" /> WhatsApp us</a></Button>}</div></div></section>
    </main>
    <footer className="bg-primary py-8 text-primary-foreground"><div className="mx-auto flex max-w-6xl flex-col justify-between gap-5 px-4 text-sm sm:px-6 md:flex-row"><div><p className="font-bold">{text(footer.school_name)}</p><p className="mt-1 max-w-md text-primary-foreground/70">{text(footer.address)}</p>{phones.length > 0 && <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">{phones.map((phone) => <a className="inline-flex items-center gap-1 text-primary-foreground/85 hover:text-primary-foreground" href={`tel:${phone.replace(/\s/g, "")}`} key={phone}><Phone className="h-3.5 w-3.5" />{phone}</a>)}</div>}</div><div className="text-primary-foreground/70"><div className="flex flex-wrap gap-3">{list(footer.extra_links).map((link: any) => link.label && link.url ? <a className="hover:text-primary-foreground" href={link.url} key={link.url}>{link.label}</a> : null)}{!contact.is_floating_whatsapp && whatsappUrl && <a className="inline-flex items-center gap-1 hover:text-primary-foreground" href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle className="h-3.5 w-3.5" />WhatsApp</a>}<button className="hover:text-primary-foreground" onClick={() => navigate("/admin/login")}>Admin Login</button></div><p className="mt-3">{text(footer.copyright_text)}</p></div></div></footer>
    {canEditSite && <HeroPhotoDialog open={heroDialogOpen} onOpenChange={setHeroDialogOpen} value={heroBg} onSaved={setHeroBg} />}
    {contact.is_floating_whatsapp && whatsappUrl && <a aria-label="Chat with ADIS on WhatsApp" className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-success text-success-foreground shadow-xl transition hover:scale-105 focus:outline-none focus:ring-4 focus:ring-success/30" href={whatsappUrl} target="_blank" rel="noreferrer" title="Chat with us on WhatsApp"><span className="absolute inset-0 animate-ping rounded-full bg-success/30" /><MessageCircle className="relative h-7 w-7" /></a>}
  </div>;
};
const InfoCard = ({ icon: Icon, card }: { icon: typeof CalendarDays; card: any }) => <Card className="h-full overflow-hidden"><CardContent className="p-0">{card.image_url && <img className="h-44 w-full object-cover" src={card.image_url} alt="" />}<div className="p-6"><Icon className="h-7 w-7 text-primary" /><h3 className="mt-4 font-bold">{card.title || "Information"}</h3>{card.description && <p className="mt-2 text-sm leading-6 text-muted-foreground">{card.description}</p>}<ul className="mt-3 space-y-2 text-sm leading-5 text-muted-foreground">{list(card.items).map((item) => <li className="flex gap-2" key={item}><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{item}</li>)}</ul>{card.document_url && <Button asChild className="mt-4" size="sm" variant="outline"><a href={card.document_url} target="_blank" rel="noreferrer"><Download className="mr-2 h-4 w-4" />{card.document_label || "Download"}</a></Button>}</div></CardContent></Card>;
export default LandingPage;
