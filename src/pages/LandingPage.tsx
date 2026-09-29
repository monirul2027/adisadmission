import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarDays, CheckCircle2, FileText, GraduationCap, HeartHandshake, HelpCircle, MapPin, MessageCircle, Phone, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import QuickStatusTracker from "@/components/QuickStatusTracker";
import DynamicSectionRenderer from "@/components/DynamicSectionRenderer";
import { supabase } from "@/integrations/supabase/client";
import { mergeSiteSettings, siteDefaults, type SiteSettings } from "@/lib/site-content";

type PageSection = { id: string; title: string; subtitle: string | null; section_type: string; content: unknown; order_index: number };
const text = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const list = (value: unknown): any[] => Array.isArray(value) ? value : [];

const LandingPage = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SiteSettings>(siteDefaults);
  const [sections, setSections] = useState<PageSection[]>([]);
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
    setSections(sectionRows || []);
  })(); }, []);

  const startApplication = () => navigate("/student/login");
  const trackerScroll = () => document.getElementById("application-status")?.scrollIntoView({ behavior: "smooth", block: "center" });
  const steps = list(hero.journey_steps).filter((step): step is string => typeof step === "string");
  const infoIcons = [CalendarDays, FileText, GraduationCap];
  const featureIcons = [Users, ShieldCheck, CheckCircle2];

  return <div className="min-h-screen bg-[#f7faf8] text-foreground">
    <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
      <button className="flex items-center gap-3 text-left" onClick={() => navigate("/")}><img alt={text(footer.school_name)} className="h-11 w-11 rounded-full border-2 border-primary/15 object-cover" src="/lovable-uploads/b3369ca5-553a-4c65-961b-27d4deb3ca86.jpg" /><span><span className="block font-bold text-primary">{text(footer.school_name)}</span><span className="hidden text-xs text-muted-foreground sm:block">Admissions Portal</span></span></button>
      <div className="flex items-center gap-2"><Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => document.getElementById("admission-info")?.scrollIntoView({ behavior: "smooth" })}>Admission info</Button><Button size="sm" onClick={startApplication}>Apply now <ArrowRight className="ml-1 h-4 w-4" /></Button></div>
    </div></header>
    <main>
      <section className="overflow-hidden bg-primary text-primary-foreground"><div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-[1.3fr_.7fr] md:py-20"><div className="max-w-2xl">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold"><span className="h-2 w-2 rounded-full bg-accent" /> {text(hero.badge_text)}</p><h1 className="text-4xl font-bold leading-tight sm:text-5xl">{text(hero.title)}</h1><p className="mt-5 max-w-xl text-base leading-7 text-white/85 sm:text-lg">{text(hero.subtitle)}</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row"><Button size="lg" variant="secondary" className="font-semibold" onClick={startApplication}>{text(hero.primary_btn_text)} <ArrowRight className="ml-2 h-4 w-4" /></Button><Button size="lg" variant="outline" className="border-white/50 bg-transparent text-white hover:bg-white/10 hover:text-white" onClick={trackerScroll}>{text(hero.secondary_btn_text)}</Button></div><p className="mt-5 flex items-center gap-2 text-sm text-white/75"><MapPin className="h-4 w-4" /> {text(hero.address)}</p>
      </div><Card className="border-0 bg-white text-foreground shadow-2xl"><CardContent className="p-6"><p className="text-sm font-semibold text-primary">Your admission journey</p><ol className="mt-4 space-y-4">{steps.map((step, index) => <li key={`${step}-${index}`} className="flex gap-3 text-sm"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{index + 1}</span><span className="pt-1 font-medium">{step}</span></li>)}</ol><Button className="mt-6 w-full" onClick={startApplication}>Start application</Button></CardContent></Card></div></section>
      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:grid-cols-3 sm:px-6">{[{ icon: FileText, title: "Simple online application", copy: "A clear form with secure document uploads." }, { icon: ShieldCheck, title: "Track your application", copy: "Check a current status without logging in." }, { icon: HeartHandshake, title: "Help when you need it", copy: "Our admissions team is ready to assist." }].map(({ icon: Icon, title, copy }) => <div className="flex gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5" key={title}><span className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></span><div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{copy}</p></div></div>)}</section>
      <QuickStatusTracker settings={settings.quick_tracker_settings} />
      <section id="admission-info" className="mx-auto max-w-6xl px-4 py-12 sm:px-6"><div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-wider text-primary">{text(info.eyebrow)}</p><h2 className="mt-2 text-3xl font-bold">{text(info.title)}</h2><p className="mt-3 text-muted-foreground">{text(info.subtitle)}</p></div><div className="mt-8 grid gap-5 md:grid-cols-3">{list(info.cards).map((card: any, index) => { const Icon = infoIcons[index] || FileText; return <InfoCard key={`${card.title}-${index}`} icon={Icon} title={card.title || "Information"} items={list(card.items)} />; })}</div></section>
      <DynamicSectionRenderer sections={sections} />
      <section className="bg-white py-12"><div className="mx-auto max-w-6xl px-4 sm:px-6"><div className="text-center"><p className="text-sm font-bold uppercase tracking-wider text-primary">{text(features.eyebrow)}</p><h2 className="mt-2 text-3xl font-bold">{text(features.title)}</h2></div><div className="mt-8 grid gap-5 sm:grid-cols-3">{list(features.cards).map((card: any, index) => { const Icon = featureIcons[index] || CheckCircle2; return <Card key={`${card.title}-${index}`} className="border-none bg-[#f7faf8]"><CardContent className="p-6"><Icon className="h-8 w-8 text-primary" /><h3 className="mt-4 font-bold">{card.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{card.description}</p></CardContent></Card>; })}</div></div></section>
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6"><div className="flex flex-col justify-between gap-6 rounded-2xl bg-accent p-7 text-accent-foreground md:flex-row md:items-center"><div><p className="text-sm font-semibold">{text(contact.helpline_title)}</p><h2 className="mt-1 text-2xl font-bold">{text(contact.helpline_subtitle)}</h2><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">{phones.length ? phones.map((phone) => <a className="inline-flex items-center gap-2 underline-offset-4 hover:underline" href={`tel:${phone.replace(/\s/g, "")}`} key={phone}><Phone className="h-4 w-4" /> {phone}</a>) : <span className="inline-flex items-center gap-2"><Phone className="h-4 w-4" /> Contact the school admissions office for assistance.</span>}</div></div><div className="flex flex-wrap gap-3"><Button className="bg-primary text-white hover:bg-primary/90" onClick={startApplication}><HelpCircle className="mr-2 h-4 w-4" /> Get started</Button>{!contact.is_floating_whatsapp && whatsappUrl && <Button asChild variant="secondary"><a href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle className="mr-2 h-4 w-4" /> WhatsApp us</a></Button>}</div></div></section>
    </main>
    <footer className="bg-primary py-8 text-primary-foreground"><div className="mx-auto flex max-w-6xl flex-col justify-between gap-5 px-4 text-sm sm:px-6 md:flex-row"><div><p className="font-bold">{text(footer.school_name)}</p><p className="mt-1 max-w-md text-white/70">{text(footer.address)}</p>{phones.length > 0 && <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">{phones.map((phone) => <a className="inline-flex items-center gap-1 text-white/85 hover:text-white" href={`tel:${phone.replace(/\s/g, "")}`} key={phone}><Phone className="h-3.5 w-3.5" />{phone}</a>)}</div>}</div><div className="text-white/70"><div className="flex flex-wrap gap-3">{list(footer.extra_links).map((link: any) => link.label && link.url ? <a className="hover:text-white" href={link.url} key={link.url}>{link.label}</a> : null)}{!contact.is_floating_whatsapp && whatsappUrl && <a className="inline-flex items-center gap-1 hover:text-white" href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle className="h-3.5 w-3.5" />WhatsApp</a>}<button className="hover:text-white" onClick={() => navigate("/admin/login")}>Admin Login</button></div><p className="mt-3">{text(footer.copyright_text)}</p></div></div></footer>
    {contact.is_floating_whatsapp && whatsappUrl && <a aria-label="Chat with ADIS on WhatsApp" className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl transition hover:scale-105 focus:outline-none focus:ring-4 focus:ring-[#25D366]/30" href={whatsappUrl} target="_blank" rel="noreferrer" title="Chat with us on WhatsApp"><span className="absolute inset-0 animate-ping rounded-full bg-[#25D366]/30" /><MessageCircle className="relative h-7 w-7" /></a>}
  </div>;
};
const InfoCard = ({ icon: Icon, title, items }: { icon: typeof CalendarDays; title: string; items: string[] }) => <Card className="h-full"><CardContent className="p-6"><Icon className="h-7 w-7 text-primary" /><h3 className="mt-4 font-bold">{title}</h3><ul className="mt-3 space-y-2 text-sm leading-5 text-muted-foreground">{items.map((item) => <li className="flex gap-2" key={item}><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{item}</li>)}</ul></CardContent></Card>;
export default LandingPage;
