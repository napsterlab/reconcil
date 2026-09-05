import { useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Router as WouterRouter, Switch, useLocation, useParams } from 'wouter';
import {
  ArrowLeft, ArrowUpRight, BarChart3, Bell, Building2, Check, CheckCheck, Download,
  CheckCircle2, ChevronDown, CircleAlert, FileCheck2,
  FileSpreadsheet, Filter, History, LayoutDashboard, Loader2, LogOut, Menu,
  MoreHorizontal, PackageOpen, Plus, ReceiptText, Search, Settings2, ShieldCheck,
  Sparkles, Target, Upload, UserPlus, Users, X, RefreshCw,
} from 'lucide-react';
import {
  getGetClientQueryKey, getGetDashboardSummaryQueryKey, getGetMeQueryKey,
  getGetReconciliationQueryKey, getGetSubscriptionQueryKey, getListClientsQueryKey,
  getListNotificationsQueryKey, getListReconciliationHistoryQueryKey, getListTeamQueryKey,
  useCreateClient,
  useCreateManualMatch, useDeleteMatch, useGetClient, useGetDashboardSummary, useGetMe,
  useGetReconciliation, useGetSubscription, useInviteTeamMember, useListClients,
  useListNotifications, useListReconciliationHistory, useListTeam, useLogin, useLogout,
  useMarkAllNotificationsRead, useMarkNotificationRead, useRunReconciliation,
} from '@workspace/api-client-react';
import type {
  Client, DashboardSummary, HistoryItem, Notification as ReconcilNotification, PricingPlan,
  Reconciliation, Subscription, TeamMember,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const money = new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 2 });
const date = (value?: string) => value ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '—';
const percent = (value = 0) => `${Math.round(value * (value <= 1 ? 100 : 1))}%`;

function cn(...values: Array<string | false | null | undefined>) { return values.filter(Boolean).join(' '); }

function Logo({ small = false }: { small?: boolean }) {
  return <div className={cn('flex items-center gap-2.5', small && 'gap-2')}>
    <div className="relative flex h-8 w-8 items-center justify-center rounded-[9px] bg-secondary text-primary shadow-[3px_3px_0_hsl(var(--primary))]">
      <span className="font-serif text-xl font-bold leading-none">R</span>
      <span className="absolute bottom-[5px] right-[5px] h-1.5 w-1.5 rounded-full bg-accent" />
    </div>
    <span className={cn('font-serif text-[21px] font-bold tracking-[-.04em] text-sidebar-foreground', small && 'text-lg')}>reconcil</span>
  </div>;
}

function NotificationMenu({ enabled }: { enabled: boolean }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const notifications = useListNotifications({
    query: {
      queryKey: getListNotificationsQueryKey(),
      enabled,
      refetchInterval: 60_000,
    },
  });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const items = (notifications.data || []) as ReconcilNotification[];
  const unreadCount = items.filter((item) => !item.read).length;

  const refresh = () => {
    void notifications.refetch();
  };

  const openNotification = (item: ReconcilNotification) => {
    if (!item.read) {
      markRead.mutate({ notificationId: item.id }, {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        },
      });
    }
    if (item.href) {
      setOpen(false);
      setLocation(item.href);
    }
  };

  const markEverythingRead = () => {
    markAllRead.mutate(undefined, {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      },
    });
  };

  return <div className="relative">
    <button
      onClick={() => setOpen((value) => !value)}
      aria-label={unreadCount ? `${unreadCount} notifications non lues` : 'Notifications'}
      aria-expanded={open}
      data-testid="button-notifications"
      className={cn('relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground', open && 'bg-muted text-foreground')}
    >
      <Bell className="h-[17px] w-[17px]" />
      {unreadCount > 0 && <span data-testid="badge-unread-notifications" className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-accent px-1 text-[8px] font-bold text-accent-foreground">{unreadCount > 9 ? '9+' : unreadCount}</span>}
    </button>
    {open && <div data-testid="notifications-panel" className="absolute right-0 top-11 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-2xl">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div><p className="text-sm font-bold">Notifications</p><p className="mt-0.5 text-[10px] text-muted-foreground">{unreadCount ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est à jour'}</p></div>
        <div className="flex items-center gap-1">
          <button onClick={refresh} disabled={notifications.isFetching} aria-label="Actualiser les notifications" data-testid="button-refresh-notifications" className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"><RefreshCw className={cn('h-3.5 w-3.5', notifications.isFetching && 'animate-spin')} /></button>
          <button onClick={markEverythingRead} disabled={!unreadCount || markAllRead.isPending} data-testid="button-mark-all-notifications-read" className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"><CheckCheck className="h-4 w-4" /></button>
          <button onClick={() => setOpen(false)} aria-label="Fermer les notifications" data-testid="button-close-notifications" className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="max-h-[360px] overflow-y-auto">
        {notifications.isLoading ? <div className="space-y-3 p-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div> : notifications.isError ? <div className="p-6 text-center"><CircleAlert className="mx-auto mb-2 h-5 w-5 text-accent" /><p className="text-xs font-semibold">Impossible de charger les notifications.</p><button onClick={refresh} className="mt-3 text-xs font-bold text-accent hover:underline">Réessayer</button></div> : items.length ? items.map((item) => <button key={item.id} onClick={() => openNotification(item)} data-testid={`notification-${item.id}`} className={cn('flex w-full gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/60', !item.read && 'bg-secondary/10')}><span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', item.read ? 'bg-border' : 'bg-accent')} /><span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-3"><strong className="text-xs">{item.title}</strong><time className="shrink-0 text-[10px] text-muted-foreground">{item.relativeTime}</time></span><span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">{item.message}</span></span></button>) : <div className="p-8 text-center"><Bell className="mx-auto mb-2 h-5 w-5 text-muted-foreground" /><p className="text-xs text-muted-foreground">Aucune notification.</p></div>}
      </div>
    </div>}
  </div>;
}

function Avatar({ initials, tone = 'dark' }: { initials?: string; tone?: 'dark' | 'gold' | 'coral' }) {
  return <span className={cn(
    'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
    tone === 'dark' && 'bg-primary text-primary-foreground',
    tone === 'gold' && 'bg-secondary text-primary',
    tone === 'coral' && 'bg-accent text-accent-foreground',
  )}>{initials || '—'}</span>;
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

function QueryState({ loading, error, empty, children, retry }: { loading?: boolean; error?: boolean; empty?: boolean; children: ReactNode; retry?: () => void }) {
  if (loading) return <div className="space-y-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>;
  if (error) return <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-8 text-center"><CircleAlert className="mx-auto mb-3 h-7 w-7 text-destructive" /><p className="font-semibold">Impossible de charger ces données</p><p className="mt-1 text-sm text-muted-foreground">Vérifiez votre connexion puis réessayez.</p>{retry && <button onClick={retry} data-testid="button-retry" className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Réessayer</button>}</div>;
  if (empty) return <div data-testid="empty-state" className="rounded-2xl border border-dashed border-border bg-card/60 p-12 text-center"><PackageOpen className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="text-sm font-semibold">Rien à afficher pour le moment</p><p className="mt-1 text-xs text-muted-foreground">Les données apparaîtront ici dès votre première action.</p></div>;
  return <>{children}</>;
}

function Shell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const sessionQuery = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false } });
  const session = sessionQuery.data;
  const logout = useLogout();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = [
    { href: '/', label: 'Vue d’ensemble', icon: LayoutDashboard },
    { href: '/clients', label: 'Dossiers clients', icon: Building2 },
    { href: '/team', label: 'Équipe', icon: Users },
    { href: '/subscription', label: 'Abonnement', icon: BarChart3 },
  ];
  const initials = session?.user?.initials || 'NA';
  return <div className="grain min-h-[100dvh] bg-background text-foreground">
    <aside className={cn('fixed inset-y-0 left-0 z-40 flex w-[244px] flex-col bg-sidebar px-4 py-5 text-sidebar-foreground transition-transform duration-300 md:translate-x-0', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
      <div className="flex items-center justify-between px-2"><Link href="/" data-testid="link-logo"><Logo /></Link><button onClick={() => setMobileOpen(false)} data-testid="button-close-menu" className="rounded-md p-1 text-sidebar-foreground/70 md:hidden"><X className="h-4 w-4" /></button></div>
      <div className="mt-10 px-2 text-[10px] font-semibold uppercase tracking-[.16em] text-sidebar-foreground/45">Espace cabinet</div>
      <nav className="mt-3 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`} className={cn('group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground', location === href || (href !== '/' && location.startsWith(href)) ? 'bg-sidebar-accent text-sidebar-foreground shadow-inner' : '')}><Icon className="h-[17px] w-[17px] opacity-75 group-hover:opacity-100" />{label}{href === '/clients' && <span className="ml-auto rounded-full bg-sidebar-foreground/10 px-2 py-0.5 text-[10px]">{session?.cabinet?.clientCount ?? '—'}</span>}</Link>)}
      </nav>
      <div className="mt-auto">
        <div className="mb-4 rounded-2xl border border-sidebar-border bg-sidebar-accent/50 p-3.5">
          <div className="flex items-center gap-2 text-secondary"><Sparkles className="h-3.5 w-3.5" /><span className="text-[11px] font-semibold">Plan {session?.cabinet?.plan || 'Essentiel'}</span></div>
          <p className="mt-2 text-[11px] leading-relaxed text-sidebar-foreground/60">Vos rapprochements sont à jour.</p>
          <Link href="/subscription" data-testid="link-upgrade" className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-secondary hover:underline">Voir les offres <ArrowUpRight className="h-3 w-3" /></Link>
        </div>
     <div className="flex items-center gap-2.5 border-t border-sidebar-border px-2 pt-4"><Avatar initials={initials} tone="gold" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{session?.user?.name || 'Votre cabinet'}</p><p className="truncate text-[10px] text-sidebar-foreground/50">{session?.cabinet?.email || 'compte démo'}</p></div><button onClick={() => logout.mutate(undefined, { onSettled: () => setLocation('/login') })} disabled={logout.isPending} data-testid="button-logout" title="Se déconnecter" className="text-sidebar-foreground/45 hover:text-sidebar-foreground disabled:opacity-50"><LogOut className="h-4 w-4" /></button></div>
      </div>
    </aside>
    {mobileOpen && <button aria-label="Fermer le menu" onClick={() => setMobileOpen(false)} data-testid="button-menu-backdrop" className="fixed inset-0 z-30 bg-primary/30 md:hidden" />}
     <main className="app-main">
      <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-border/70 bg-background/90 px-5 backdrop-blur-md md:px-9">
        <button onClick={() => setMobileOpen(true)} data-testid="button-open-menu" className="rounded-lg p-2 hover:bg-muted md:hidden"><Menu className="h-5 w-5" /></button>
        <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex"><span className="h-1.5 w-1.5 rounded-full bg-secondary" /> Cabinet {session?.cabinet?.name || 'Atlas Conseil'}</div>
        <div className="ml-auto flex items-center gap-3"><NotificationMenu enabled={Boolean(session)} /><div className="h-5 w-px bg-border" /><span className="text-xs text-muted-foreground">{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date())}</span></div>
      </header>
       <div className="mx-auto max-w-[1440px] px-5 py-7 md:px-9 md:py-9">{sessionQuery.isLoading ? <div className="space-y-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div> : sessionQuery.isError ? <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-8 text-center"><p className="font-semibold">Votre session a expiré.</p><button onClick={() => setLocation('/login')} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Retour à la connexion</button></div> : children}</div>
    </main>
  </div>;
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.17em] text-muted-foreground">{eyebrow && <><span className="h-1.5 w-1.5 rounded-full bg-secondary" />{eyebrow}</>}</div><h1 className="font-serif text-[31px] font-bold tracking-[-.045em] text-foreground md:text-[37px]">{title}</h1>{description && <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p>}</div>{action}</div>;
}

function StatCard({ label, value, detail, icon: Icon, accent = false }: { label: string; value: string | number; detail: string; icon: typeof Target; accent?: boolean }) {
  return <div className={cn('relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[0_2px_0_hsl(var(--border))]', accent && 'bg-primary text-primary-foreground')}><div className="flex items-start justify-between"><span className={cn('text-[11px] font-semibold uppercase tracking-[.12em]', accent ? 'text-primary-foreground/60' : 'text-muted-foreground')}>{label}</span><Icon className={cn('h-4 w-4', accent ? 'text-secondary' : 'text-accent')} /></div><div className="mt-6 flex items-end justify-between"><strong className="font-mono text-[29px] font-medium tracking-[-.06em]">{value}</strong><span className={cn('text-[11px]', accent ? 'text-primary-foreground/60' : 'text-muted-foreground')}>{detail}</span></div>{accent && <div className="absolute -bottom-8 -right-5 h-24 w-24 rounded-full border-[10px] border-secondary/10" />}</div>;
}

function Dashboard() {
  const summary = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const clients = useListClients({ query: { queryKey: getListClientsQueryKey() } });
  const data = summary.data as DashboardSummary | undefined;
  const clientRows = (clients.data || []).slice(0, 5);
  return <><PageHeading eyebrow="Bonjour, votre contrôle mensuel" title="La situation du cabinet." description="Un aperçu clair des dossiers qui avancent, et de ceux qui méritent votre attention." action={<Link href="/clients" data-testid="link-dashboard-clients" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-[3px_3px_0_hsl(var(--secondary))] hover:translate-y-[-1px]"><Plus className="h-4 w-4" /> Nouveau dossier</Link>} />
    <QueryState loading={summary.isLoading} error={summary.isError} retry={() => summary.refetch()}><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Dossiers actifs" value={data?.totalClients ?? '—'} detail="dans le cabinet" icon={Building2} />
      <StatCard label="Rapprochés ce mois" value={data?.reconciledThisMonth ?? '—'} detail="dossiers terminés" icon={CheckCircle2} accent />
      <StatCard label="Exceptions à traiter" value={data?.pendingExceptions ?? '—'} detail="lignes en suspens" icon={CircleAlert} />
      <StatCard label="Automatisation moyenne" value={data ? percent(data.averageAutomationRate) : '—'} detail="sur vos dossiers" icon={Target} />
    </div></QueryState>
    <div className="mt-8 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
      <section className="overflow-hidden rounded-2xl border border-border bg-card"><div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="font-serif text-lg font-bold">Dossiers à surveiller</h2><p className="mt-0.5 text-xs text-muted-foreground">Les derniers fichiers ouverts par votre équipe</p></div><Link href="/clients" data-testid="link-see-all-clients" className="text-xs font-semibold text-accent hover:underline">Tout voir <ArrowUpRight className="ml-1 inline h-3.5 w-3.5" /></Link></div>
        <QueryState loading={clients.isLoading} error={clients.isError} empty={!clients.isLoading && !clients.data?.length} retry={() => clients.refetch()}><div className="divide-y divide-border">{clientRows.map((client) => <ClientRow key={client.id} client={client} />)}</div></QueryState>
      </section>
      <section className="rounded-2xl border border-border bg-card"><div className="border-b border-border px-5 py-4"><h2 className="font-serif text-lg font-bold">Fil d’activité</h2><p className="mt-0.5 text-xs text-muted-foreground">Ce qui s’est passé récemment</p></div><QueryState loading={summary.isLoading} error={summary.isError} empty={!data?.recentActivity?.length} retry={() => summary.refetch()}><div className="space-y-5 p-5">{data?.recentActivity?.map((activity) => <div key={activity.id} data-testid={`activity-${activity.id}`} className="flex gap-3"><Avatar initials={activity.initials} tone="gold" /><div className="min-w-0"><p className="text-xs leading-relaxed"><span className="font-semibold">{activity.text}</span> <span className="text-muted-foreground">· {activity.clientName}</span></p><p className="mt-1 text-[11px] text-muted-foreground">{activity.relativeTime}</p></div></div>)}</div></QueryState></section>
    </div>
    <div className="mt-7 flex items-center gap-3 rounded-2xl border border-secondary/35 bg-secondary/10 px-5 py-4"><ShieldCheck className="h-5 w-5 text-accent" /><p className="text-xs text-foreground/75"><strong className="font-semibold text-foreground">Contrôle en confiance.</strong> Chaque rapprochement garde une trace de ses règles, de ses exceptions et de sa validation.</p><Link href="/subscription" data-testid="link-dashboard-subscription" className="ml-auto hidden shrink-0 text-xs font-semibold text-accent md:block">Configurer <ArrowUpRight className="ml-1 inline h-3.5 w-3.5" /></Link></div>
  </>;
}

function ClientRow({ client }: { client: Client }) {
  const complete = client.exceptionCount === 0 && client.totalCount > 0;
  return <Link href={`/clients/${client.id}`} data-testid={`link-client-${client.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-xs font-bold text-foreground">{client.companyName.slice(0, 2).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{client.companyName}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{client.sector} · {client.bank}</p></div><div className="hidden text-right sm:block"><p className="font-mono text-xs">{client.totalCount ? `${client.matchedCount}/${client.totalCount}` : '—'}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{client.lastPeriod || 'Aucun import'}</p></div><span className={cn('rounded-full px-2.5 py-1 text-[10px] font-semibold', complete ? 'bg-secondary/25 text-foreground' : 'bg-accent/15 text-accent')}>{complete ? 'À jour' : `${client.exceptionCount ?? 0} exception${client.exceptionCount === 1 ? '' : 's'}`}</span><ArrowUpRight className="h-4 w-4 text-muted-foreground" /></Link>;
}

function Clients() {
  const queryClient = useQueryClient();
  const clients = useListClients({ query: { queryKey: getListClientsQueryKey() } });
  const create = useCreateClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ companyName: '', ifIce: '', sector: 'Services', bank: 'Attijariwafa bank' });
  const filtered = useMemo(() => (clients.data || []).filter((c) => `${c.companyName} ${c.ifIce} ${c.sector}`.toLowerCase().includes(search.toLowerCase())), [clients.data, search]);
  const submit = (event: FormEvent) => { event.preventDefault(); create.mutate({ data: form }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() }); setOpen(false); setForm({ companyName: '', ifIce: '', sector: 'Services', bank: 'Attijariwafa bank' }); } }); };
  return <><PageHeading eyebrow="Portefeuille" title="Dossiers clients" description="Un espace par société, pour importer, rapprocher et valider sans perdre le fil." action={<button onClick={() => setOpen(true)} data-testid="button-new-client" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-[3px_3px_0_hsl(var(--secondary))] hover:translate-y-[-1px]"><Plus className="h-4 w-4" /> Nouveau dossier</button>} />
    <div className="mb-5 flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-search-clients" placeholder="Rechercher une société, un ICE…" className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary" /></label><button data-testid="button-filter-clients" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-semibold hover:bg-muted"><Filter className="h-4 w-4" /> Filtres <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /></button></div>
    <QueryState loading={clients.isLoading} error={clients.isError} empty={!clients.isLoading && !filtered.length} retry={() => clients.refetch()}><div className="overflow-hidden rounded-2xl border border-border bg-card"><div className="hidden grid-cols-[1.6fr_1fr_1fr_1fr_110px] gap-4 border-b border-border bg-muted/45 px-5 py-3 text-[10px] font-bold uppercase tracking-[.13em] text-muted-foreground md:grid"><span>Société</span><span>Dernière période</span><span>Avancement</span><span>Responsable</span><span className="text-right">Statut</span></div><div className="divide-y divide-border">{filtered.map((client) => <Link href={`/clients/${client.id}`} key={client.id} data-testid={`link-client-list-${client.id}`} className="grid grid-cols-1 gap-3 px-5 py-4 hover:bg-muted/35 md:grid-cols-[1.6fr_1fr_1fr_1fr_110px] md:items-center md:gap-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-foreground">{client.companyName.slice(0, 2).toUpperCase()}</div><div><p className="text-sm font-semibold">{client.companyName}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{client.ifIce} · {client.sector}</p></div></div><div><p className="text-xs font-medium">{client.lastPeriod || 'Pas encore rapproché'}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{client.lastRunAt ? date(client.lastRunAt) : 'En attente d’import'}</p></div><div><div className="mb-1.5 flex justify-between text-[11px]"><span>{client.totalCount ? `${client.matchedCount}/${client.totalCount} lignes` : '—'}</span><span className="font-semibold">{client.totalCount ? percent(client.automationRate) : ''}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-secondary" style={{ width: `${Math.min(100, client.automationRate <= 1 ? client.automationRate * 100 : client.automationRate)}%` }} /></div></div><div className="flex items-center gap-2"><Avatar initials={client.ownerInitials} tone="gold" /><span className="text-xs text-muted-foreground">{client.ownerInitials || '—'}</span></div><div className="flex items-center justify-between md:justify-end"><span className={cn('rounded-full px-2.5 py-1 text-[10px] font-semibold', client.exceptionCount ? 'bg-accent/15 text-accent' : 'bg-secondary/25 text-foreground')}>{client.exceptionCount ? `${client.exceptionCount} à revoir` : 'À jour'}</span><ArrowUpRight className="ml-2 h-4 w-4 text-muted-foreground md:hidden" /></div></Link>)}</div></div></QueryState>
    {open && <Modal title="Créer un dossier client" onClose={() => setOpen(false)}><form onSubmit={submit} className="space-y-4"><Field label="Raison sociale" value={form.companyName} required placeholder="Ex. Les Jardins du Rif" onChange={(v) => setForm({ ...form, companyName: v })} testId="input-company-name" /><Field label="ICE" value={form.ifIce} required placeholder="001234567000089" onChange={(v) => setForm({ ...form, ifIce: v })} testId="input-client-ice" /><div className="grid grid-cols-2 gap-3"><Field label="Secteur" value={form.sector} required placeholder="Services" onChange={(v) => setForm({ ...form, sector: v })} testId="input-client-sector" /><Field label="Banque principale" value={form.bank} required placeholder="Attijariwafa bank" onChange={(v) => setForm({ ...form, bank: v })} testId="input-client-bank" /></div><button disabled={create.isPending} data-testid="button-create-client-submit" className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-60">{create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Créer le dossier</button></form></Modal>}
  </>;
}

function Field({ label, value, onChange, placeholder, required, testId, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean; testId: string; type?: string }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold">{label}</span><input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} data-testid={testId} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-primary" /></label>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-primary/30 p-0 backdrop-blur-sm sm:items-center sm:p-4"><div className="w-full max-w-md rounded-t-2xl border border-border bg-card p-6 shadow-2xl sm:rounded-2xl"><div className="mb-6 flex items-center justify-between"><h2 className="font-serif text-xl font-bold">{title}</h2><button onClick={onClose} data-testid="button-close-modal" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button></div>{children}</div></div>;
}

function UploadCard({ label, fileName, onFile, accept, hint }: { label: string; fileName?: string; onFile: (file: File) => void; accept: string; hint: string }) {
  return <label className={cn('group flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border bg-background p-3.5 hover:border-primary hover:bg-muted/40', fileName && 'border-secondary/70 bg-secondary/10')}><input type="file" accept={accept} className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} data-testid={`input-upload-${label.toLowerCase().replaceAll(' ', '-')}`} /><div className={cn('flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground', fileName && 'bg-secondary text-primary')}><FileSpreadsheet className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="text-[11px] font-semibold">{label}</p><p className="truncate text-[10px] text-muted-foreground">{fileName || hint}</p></div>{fileName ? <CheckCircle2 className="h-4 w-4 text-accent" /> : <Upload className="h-4 w-4 text-muted-foreground group-hover:text-primary" />}</label>;
}

function Workspace() {
  const { clientId } = useParams<{ clientId: string }>();
  const queryClient = useQueryClient();
  const client = useGetClient(clientId, { query: { queryKey: getGetClientQueryKey(clientId) } });
  const reconciliation = useGetReconciliation(clientId, { query: { queryKey: getGetReconciliationQueryKey(clientId) } });
  const run = useRunReconciliation();
  const manual = useCreateManualMatch();
  const unlink = useDeleteMatch();
  const [bankFile, setBankFile] = useState<File>();
  const [accountingFile, setAccountingFile] = useState<File>();
  const [preview, setPreview] = useState<string[][]>([]);
  const [tolerance, setTolerance] = useState(2);
  const [threshold, setThreshold] = useState(.75);
  const [tab, setTab] = useState<'all' | 'exceptions'>('all');
  const [selectedBank, setSelectedBank] = useState('');
  const [selectedAccounting, setSelectedAccounting] = useState('');
  const rec = reconciliation.data as Reconciliation | undefined;
  const bankRows = rec?.bankTransactions || [];
  const accountingRows = rec?.accountingEntries || [];
  const matchedIds = new Set((rec?.matches || []).map((m) => m.bankTransactionId));
  const visible = bankRows.filter((row) => tab === 'all' || !matchedIds.has(row.id));
  const parseFile = (file: File, setter: (f: File) => void) => { setter(file); if (file.name.endsWith('.csv')) { const reader = new FileReader(); reader.onload = () => setPreview(String(reader.result).split(/\r?\n/).slice(0, 5).map((line) => line.split(';').length > 1 ? line.split(';') : line.split(','))); reader.readAsText(file); } };
  const runIt = () => run.mutate({ clientId, data: { toleranceDays: tolerance, similarityThreshold: threshold } }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetReconciliationQueryKey(clientId) }); queryClient.invalidateQueries({ queryKey: getGetClientQueryKey(clientId) }); } });
  const manualIt = () => { if (!selectedBank || !selectedAccounting) return; manual.mutate({ clientId, data: { bankTransactionId: selectedBank, accountingEntryId: selectedAccounting } }, { onSuccess: () => { setSelectedBank(''); setSelectedAccounting(''); queryClient.invalidateQueries({ queryKey: getGetReconciliationQueryKey(clientId) }); } }); };
  const unlinkIt = (matchId: string) => unlink.mutate({ clientId, matchId }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetReconciliationQueryKey(clientId) }); queryClient.invalidateQueries({ queryKey: getGetClientQueryKey(clientId) }); } });
  return <><Link href="/clients" data-testid="link-back-clients" className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Tous les dossiers</Link>
     <QueryState loading={client.isLoading} error={client.isError} retry={() => client.refetch()}><PageHeading eyebrow="Dossier client" title={client.data?.companyName || 'Rapprochement'} description={`${client.data?.ifIce || 'ICE non renseigné'} · ${client.data?.sector || 'Secteur non renseigné'} · ${client.data?.bank || 'Banque non renseignée'}`} action={<div className="flex items-center gap-2"><Link href={`/clients/${clientId}/history`} data-testid="link-client-history" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-semibold hover:bg-muted"><History className="h-4 w-4" /> Historique</Link><button onClick={runIt} disabled={run.isPending || !(bankFile || rec?.bankFile) || !(accountingFile || rec?.accountingFile)} data-testid="button-run-reconciliation" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-[3px_3px_0_hsl(var(--secondary))] disabled:cursor-not-allowed disabled:opacity-50">{run.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-secondary" />} Lancer le rapprochement</button></div>} />
       <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
         <section className="rounded-2xl border border-border bg-card p-5"><div className="mb-5 flex items-start justify-between"><div><h2 className="font-serif text-lg font-bold">Préparer le contrôle</h2><p className="mt-1 text-xs text-muted-foreground">Déposez les deux exports de la même période.</p></div><span className="rounded-full bg-muted px-2.5 py-1 font-mono text-[10px]">{rec?.period || 'Période en attente'}</span></div><div className="space-y-3"><UploadCard label="Relevé bancaire" fileName={bankFile?.name || rec?.bankFile} accept=".pdf,.csv" hint="PDF, CSV · déposer ou choisir" onFile={(f) => parseFile(f, setBankFile)} /><UploadCard label="Écritures comptables" fileName={accountingFile?.name || rec?.accountingFile} accept=".csv,.xlsx,.xls" hint="CSV, XLSX · déposer ou choisir" onFile={(f) => parseFile(f, setAccountingFile)} /></div><div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4"><span className="text-[10px] font-semibold text-muted-foreground">Fichiers d’exemple</span><a href="/demo/releve-bancaire-exemple.csv" download data-testid="link-download-bank-sample" className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-accent hover:underline"><Download className="h-3 w-3" /> Relevé bancaire</a><a href="/demo/export-comptable-exemple.csv" download data-testid="link-download-accounting-sample" className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-accent hover:underline"><Download className="h-3 w-3" /> Export comptable</a><a href="/demo/releve-cih-exemple.csv" download data-testid="link-download-second-bank-sample" className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-accent hover:underline"><Download className="h-3 w-3" /> Exemple CIH</a></div>{preview.length > 0 && <div className="mt-5 rounded-xl border border-secondary/35 bg-secondary/10 p-3"><div className="mb-2 flex items-center gap-2 text-[11px] font-semibold"><FileCheck2 className="h-3.5 w-3.5 text-accent" /> Aperçu du relevé · 4 premières lignes</div><div className="overflow-hidden rounded-lg border border-border bg-card"><table className="w-full text-left text-[10px]"><tbody>{preview.map((row, i) => <tr key={i} className="border-b border-border last:border-0">{row.slice(0, 4).map((cell, j) => <td key={j} className={cn('max-w-[120px] truncate px-2 py-1.5', i === 0 && 'font-semibold text-muted-foreground')}>{cell}</td>)}</tr>)}</tbody></table></div></div>}<div className="mt-6 border-t border-border pt-5"><div className="mb-3 flex items-center gap-2"><Settings2 className="h-4 w-4 text-accent" /><h3 className="text-xs font-bold">Règles de rapprochement</h3></div><label className="mb-4 flex items-center justify-between text-xs"><span>Délai de tolérance sur la date</span><select value={tolerance} onChange={(e) => setTolerance(Number(e.target.value))} data-testid="select-tolerance-days" className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs font-mono"><option value={0}>0 jour</option><option value={1}>1 jour</option><option value={2}>2 jours</option><option value={3}>3 jours</option><option value={5}>5 jours</option></select></label><label className="flex items-center justify-between text-xs"><span>Seuil de similarité</span><select value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} data-testid="select-similarity-threshold" className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs font-mono"><option value={.7}>70%</option><option value={.75}>75%</option><option value={.8}>80%</option><option value={.9}>90%</option></select></label></div></section>
       <section className="overflow-hidden rounded-2xl border border-border bg-card"><div className="flex flex-col justify-between gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center"><div><h2 className="font-serif text-lg font-bold">Résultat du contrôle</h2><p className="mt-1 text-xs text-muted-foreground">{rec?.runStatus === 'completed' ? 'Dernier rapprochement calculé avec vos règles.' : 'Lancez le moteur pour voir les correspondances.'}</p></div><div className="flex rounded-lg bg-muted p-1"><button onClick={() => setTab('all')} data-testid="button-tab-all-transactions" className={cn('rounded-md px-3 py-1.5 text-[11px] font-semibold', tab === 'all' && 'bg-card shadow-sm')}>Toutes <span className="ml-1 text-muted-foreground">{bankRows.length}</span></button><button onClick={() => setTab('exceptions')} data-testid="button-tab-exceptions" className={cn('rounded-md px-3 py-1.5 text-[11px] font-semibold', tab === 'exceptions' && 'bg-card text-accent shadow-sm')}>Exceptions <span className="ml-1">{bankRows.length - matchedIds.size}</span></button></div></div><div className="grid grid-cols-3 divide-x divide-border border-b border-border"><div className="p-4"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Rapprochées</p><p className="mt-1 font-mono text-xl font-medium">{rec?.matches?.length ?? '—'}</p></div><div className="p-4"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Exceptions</p><p className="mt-1 font-mono text-xl font-medium text-accent">{rec ? bankRows.length - matchedIds.size : '—'}</p></div><div className="p-4"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Taux</p><p className="mt-1 font-mono text-xl font-medium">{rec ? percent(rec.matches.length / Math.max(1, bankRows.length)) : '—'}</p></div></div><div className="max-h-[430px] overflow-auto">{visible.length ? <table className="w-full text-left"><thead className="sticky top-0 bg-card text-[10px] uppercase tracking-wider text-muted-foreground"><tr><th className="px-5 py-3 font-semibold">Date / libellé</th><th className="px-3 py-3 font-semibold">Montant</th><th className="px-3 py-3 font-semibold">Rapprochement</th><th className="px-5 py-3" /></tr></thead><tbody className="divide-y divide-border">{visible.map((row) => { const isMatched = matchedIds.has(row.id); const match = rec?.matches.find((item) => item.bankTransactionId === row.id); return <tr key={row.id} data-testid={`row-transaction-${row.id}`} className="text-xs hover:bg-muted/30"><td className="max-w-[230px] px-5 py-3"><p className="font-medium">{row.label}</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{date(row.date)}</p></td><td className="whitespace-nowrap px-3 py-3 font-mono">{money.format(row.amount)}</td><td className="px-3 py-3"><span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold', isMatched ? 'bg-secondary/25 text-foreground' : 'bg-accent/15 text-accent')}>{isMatched ? <Check className="h-3 w-3" /> : <CircleAlert className="h-3 w-3" />}{isMatched ? 'Rapprochée' : 'À vérifier'}</span></td><td className="px-5 py-3 text-right"><button disabled={unlink.isPending && unlink.variables?.matchId === match?.id} onClick={() => match ? unlinkIt(match.id) : setSelectedBank(row.id)} data-testid={`button-select-bank-${row.id}`} className="text-[10px] font-semibold text-accent disabled:text-muted-foreground">{isMatched ? <>{unlink.isPending && unlink.variables?.matchId === match?.id ? 'Déliaison…' : 'Délier'}</> : 'Associer'}</button></td></tr>; })}</tbody></table> : <div className="p-14 text-center"><PackageOpen className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="text-sm font-semibold">{rec ? 'Aucune exception, bon travail.' : 'Vos résultats apparaîtront ici.'}</p><p className="mt-1 text-xs text-muted-foreground">{rec ? 'Toutes les lignes ont trouvé leur équivalent.' : 'Importez vos fichiers puis lancez le moteur.'}</p></div>}</div></section>
      </div>
      {selectedBank && <section className="mt-5 rounded-2xl border border-accent/30 bg-accent/5 p-5"><div className="flex flex-col gap-4 md:flex-row md:items-end"><div className="flex-1"><p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-accent">Association manuelle</p><p className="text-sm">Choisissez l’écriture comptable qui correspond à l’opération sélectionnée.</p></div><select value={selectedAccounting} onChange={(e) => setSelectedAccounting(e.target.value)} data-testid="select-accounting-match" className="h-10 min-w-[250px] rounded-lg border border-border bg-card px-3 text-xs">{<option value="">Sélectionner une écriture…</option>}{accountingRows.filter((r) => !r.matchId).map((entry) => <option key={entry.id} value={entry.id}>{date(entry.date)} · {money.format(entry.amount)} · {entry.label}</option>)}</select><button onClick={manualIt} disabled={!selectedAccounting || manual.isPending} data-testid="button-validate-manual-match" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-xs font-bold text-accent-foreground disabled:opacity-50">{manual.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Valider l’association</button><button onClick={() => setSelectedBank('')} data-testid="button-cancel-manual-match" className="h-10 rounded-lg px-3 text-xs font-semibold text-muted-foreground hover:bg-muted">Annuler</button></div></section>}
    </QueryState>
  </>;
}

function HistoryPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const client = useGetClient(clientId, { query: { queryKey: getGetClientQueryKey(clientId) } });
  const history = useListReconciliationHistory(clientId, { query: { queryKey: getListReconciliationHistoryQueryKey(clientId) } });
  return <><Link href={`/clients/${clientId}`} data-testid="link-back-workspace" className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Retour au dossier</Link><PageHeading eyebrow="Journal de contrôle" title={client.data?.companyName || 'Historique'} description="Une trace lisible de chaque rapprochement validé, période après période." /><QueryState loading={history.isLoading} error={history.isError} empty={!history.isLoading && !history.data?.length} retry={() => history.refetch()}><div className="overflow-hidden rounded-2xl border border-border bg-card"><div className="hidden grid-cols-[1.2fr_1.2fr_1fr_1fr_110px] gap-4 border-b border-border bg-muted/45 px-5 py-3 text-[10px] font-bold uppercase tracking-[.13em] text-muted-foreground md:grid"><span>Période</span><span>Terminé le</span><span>Automatisation</span><span>Lignes rapprochées</span><span>Statut</span></div><div className="divide-y divide-border">{(history.data as HistoryItem[] | undefined)?.map((item) => <div key={item.id} data-testid={`row-history-${item.id}`} className="grid gap-2 px-5 py-4 md:grid-cols-[1.2fr_1.2fr_1fr_1fr_110px] md:items-center"><span className="font-semibold text-sm">{item.period}</span><span className="text-xs text-muted-foreground">{date(item.completedAt)}</span><span className="flex items-center gap-2 text-xs font-mono"><span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted"><span className="block h-full bg-secondary" style={{ width: `${item.automationRate <= 1 ? item.automationRate * 100 : item.automationRate}%` }} /></span>{percent(item.automationRate)}</span><span className="text-xs"><strong>{item.matchedCount}</strong> <span className="text-muted-foreground">rapprochées · {item.exceptionCount} exception{item.exceptionCount === 1 ? '' : 's'}</span></span><span className={cn('w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold', item.status === 'valide' ? 'bg-secondary/25' : 'bg-muted text-muted-foreground')}>{item.status === 'valide' ? 'Validé' : 'Brouillon'}</span></div>)}</div></div></QueryState></>;
}

function Team() {
  const queryClient = useQueryClient();
  const team = useListTeam({ query: { queryKey: getListTeamQueryKey() } });
  const invite = useInviteTeamMember();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'collaborateur' as 'admin' | 'collaborateur' });
  const submit = (e: FormEvent) => { e.preventDefault(); invite.mutate({ data: form }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListTeamQueryKey() }); setOpen(false); setForm({ name: '', email: '', role: 'collaborateur' }); } }); };
  return <><PageHeading eyebrow="Le cabinet" title="Une équipe alignée." description="Invitez vos collaborateurs et donnez à chacun une vue claire sur les contrôles à terminer." action={<button onClick={() => setOpen(true)} data-testid="button-invite-member" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-[3px_3px_0_hsl(var(--secondary))]"><UserPlus className="h-4 w-4" /> Inviter un collaborateur</button>} /><QueryState loading={team.isLoading} error={team.isError} empty={!team.isLoading && !team.data?.length} retry={() => team.refetch()}><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{(team.data as TeamMember[] | undefined)?.map((member) => <div key={member.id} data-testid={`card-team-member-${member.id}`} className="group rounded-2xl border border-border bg-card p-5 hover:border-secondary/70"><div className="flex items-start justify-between"><Avatar initials={member.initials} tone={member.role === 'admin' ? 'gold' : 'dark'} /><button data-testid={`button-member-options-${member.id}`} className="rounded-md p-1 text-muted-foreground opacity-0 hover:bg-muted group-hover:opacity-100"><MoreHorizontal className="h-4 w-4" /></button></div><p className="mt-5 text-sm font-bold">{member.name}</p><p className="mt-1 text-xs text-muted-foreground">{member.email}</p><div className="mt-5 flex items-center justify-between border-t border-border pt-3"><span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{member.role === 'admin' ? 'Administrateur' : 'Collaborateur'}</span><span className={cn('flex items-center gap-1.5 text-[10px] font-semibold', member.status === 'actif' ? 'text-accent' : 'text-muted-foreground')}><span className={cn('h-1.5 w-1.5 rounded-full', member.status === 'actif' ? 'bg-accent' : 'bg-muted-foreground')} />{member.status === 'actif' ? 'Actif' : 'Invitation envoyée'}</span></div></div>)}</div></QueryState>{open && <Modal title="Inviter un collaborateur" onClose={() => setOpen(false)}><form onSubmit={submit} className="space-y-4"><Field label="Nom complet" value={form.name} required placeholder="Ex. Salma El Idrissi" onChange={(v) => setForm({ ...form, name: v })} testId="input-member-name" /><Field label="Adresse email" value={form.email} required type="email" placeholder="salma@cabinet.ma" onChange={(v) => setForm({ ...form, email: v })} testId="input-member-email" /><label className="block"><span className="mb-1.5 block text-xs font-semibold">Rôle</span><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'admin' | 'collaborateur' })} data-testid="select-member-role" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"><option value="collaborateur">Collaborateur</option><option value="admin">Administrateur</option></select></label><button disabled={invite.isPending} data-testid="button-send-invite" className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-60">{invite.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Envoyer l’invitation</button></form></Modal>}</>;
}

function Subscription() {
  const plans = useGetSubscription({ query: { queryKey: getGetSubscriptionQueryKey() } });
  const subscription = plans.data as Subscription | undefined;
  return <><PageHeading eyebrow="Abonnement" title="Un plan qui suit votre cabinet." description="Des contrôles fiables, sans remplacer vos outils comptables. Choisissez simplement le rythme de votre activité." /><QueryState loading={plans.isLoading} error={plans.isError} empty={!plans.isLoading && !subscription?.plans?.length} retry={() => plans.refetch()}>{subscription && <div className="mb-5 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-border bg-card p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Dossiers actifs facturés</p><p className="mt-2 font-mono text-2xl">{subscription.current.activeClientCount}</p></div><div className="rounded-2xl border border-border bg-card p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Montant mensuel estimé</p><p className="mt-2 font-mono text-2xl">{money.format(subscription.current.estimatedMonthlyAmountMad)}</p></div></div>}<div className="grid gap-4 lg:grid-cols-3">{subscription?.plans.map((plan, index) => <div key={plan.id} data-testid={`card-pricing-${plan.id}`} className={cn('relative flex flex-col rounded-2xl border p-6', plan.highlighted ? 'border-primary bg-primary text-primary-foreground shadow-[5px_5px_0_hsl(var(--secondary))]' : 'border-border bg-card')}>{plan.highlighted && <span className="absolute right-5 top-5 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-primary">Le plus choisi</span>}<div className={cn('mb-7 flex h-10 w-10 items-center justify-center rounded-xl', plan.highlighted ? 'bg-secondary text-primary' : 'bg-muted text-accent')}><ReceiptText className="h-5 w-5" /></div><h2 className="font-serif text-2xl font-bold">{plan.name}</h2><p className={cn('mt-2 min-h-10 text-xs leading-relaxed', plan.highlighted ? 'text-primary-foreground/65' : 'text-muted-foreground')}>{plan.description}</p><div className="mt-6 flex items-baseline gap-1"><span className="font-mono text-3xl font-medium">{plan.price}</span>{index > 0 && <span className={cn('text-xs', plan.highlighted ? 'text-primary-foreground/60' : 'text-muted-foreground')}>/ mois</span>}</div><div className={cn('my-6 h-px', plan.highlighted ? 'bg-primary-foreground/15' : 'bg-border')} /><ul className="flex-1 space-y-3">{plan.features.map((feature) => <li key={feature} className="flex gap-2 text-xs"><Check className={cn('h-4 w-4 shrink-0', plan.highlighted ? 'text-secondary' : 'text-accent')} />{feature}</li>)}</ul><button onClick={() => window.alert(`Le plan ${plan.name} sera activé avec votre cabinet.`)} data-testid={`button-choose-plan-${plan.id}`} className={cn('mt-8 h-11 rounded-xl text-xs font-bold', plan.highlighted ? 'bg-secondary text-primary hover:bg-secondary/90' : 'border border-border bg-background hover:bg-muted')}>{plan.highlighted ? 'Plan actuel' : 'Choisir ce plan'}</button></div>)}</div></QueryState><div className="mt-8 flex items-start gap-3 rounded-2xl border border-border bg-card p-5"><ShieldCheck className="mt-0.5 h-5 w-5 text-accent" /><div><p className="text-sm font-semibold">Vos données restent chez vous.</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Reconcil se concentre sur le rapprochement. Vos exports restent compatibles avec Excel, Sage et EBP, sans vous enfermer dans une suite comptable.</p></div></div></>;
}

function Login() {
  const [, setLocation] = useLocation();
  const login = useLogin();
  const [email, setEmail] = useState('demo@cabinet-atlas.ma');
  const [password, setPassword] = useState('demo');
  const submit = (e: FormEvent) => { e.preventDefault(); login.mutate({ data: { email, password } }, { onSuccess: () => setLocation('/') }); };
  return <div className="grain flex min-h-[100dvh] bg-primary text-primary-foreground"><div className="hidden w-[43%] flex-col justify-between border-r border-primary-foreground/10 p-10 lg:flex"><Logo /><div className="max-w-md"><div className="mb-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-secondary"><span className="h-1.5 w-1.5 rounded-full bg-secondary" /> Rapprochement bancaire</div><h1 className="font-serif text-[52px] font-bold leading-[.95] tracking-[-.06em]">Le contrôle<br /><span className="text-secondary">enfin lisible.</span></h1><p className="mt-6 max-w-sm text-sm leading-relaxed text-primary-foreground/60">Reconcil accompagne les cabinets marocains dans leur contrôle mensuel, avec la rigueur d’un grand livre et la simplicité d’une bonne feuille de calcul.</p><div className="mt-10 flex items-center gap-5 text-xs text-primary-foreground/50"><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-secondary" /> Compatible Excel, Sage, EBP</span><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-secondary" /> Données maîtrisées</span></div></div><p className="text-[10px] uppercase tracking-[.16em] text-primary-foreground/30">Reconcil · Casa / Rabat / partout au Maroc</p></div><div className="flex flex-1 items-center justify-center p-6 sm:p-10"><div className="w-full max-w-[390px]"><div className="mb-10 lg:hidden"><Logo /></div><div className="mb-8"><p className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-secondary">Espace cabinet</p><h2 className="font-serif text-3xl font-bold tracking-[-.04em]">Bon retour.</h2><p className="mt-2 text-sm text-primary-foreground/55">Connectez-vous pour retrouver vos dossiers.</p></div><form onSubmit={submit} className="space-y-4"><label className="block"><span className="mb-2 block text-xs font-semibold text-primary-foreground/75">Email professionnel</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="input-login-email" className="h-12 w-full rounded-xl border border-primary-foreground/15 bg-primary-foreground/10 px-4 text-sm outline-none placeholder:text-primary-foreground/30 focus:border-secondary" /></label><label className="block"><span className="mb-2 block text-xs font-semibold text-primary-foreground/75">Mot de passe</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="input-login-password" className="h-12 w-full rounded-xl border border-primary-foreground/15 bg-primary-foreground/10 px-4 text-sm outline-none focus:border-secondary" /></label>{login.isError && <p data-testid="status-login-error" className="rounded-lg bg-destructive/20 px-3 py-2 text-xs text-red-100">Email ou mot de passe incorrect.</p>}<button disabled={login.isPending} data-testid="button-login-submit" className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-bold text-primary shadow-[3px_3px_0_hsl(var(--accent))] disabled:opacity-60">{login.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Ouvrir mon espace</button></form><p className="mt-8 text-center text-xs text-primary-foreground/40">Démo : <span className="text-primary-foreground/65">demo@cabinet-atlas.ma</span> · mot de passe <span className="text-primary-foreground/65">demo</span></p></div></div></div>;
}

function AppRoutes() {
  const [location] = useLocation();
  if (location === '/login') return <Login />;
  return <Shell><Switch><Route path="/" component={Dashboard} /><Route path="/clients" component={Clients} /><Route path="/clients/:clientId/history" component={HistoryPage} /><Route path="/clients/:clientId" component={Workspace} /><Route path="/team" component={Team} /><Route path="/subscription" component={Subscription} /><Route component={NotFound} /></Switch></Shell>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><ErrorBoundary><AppRoutes /></ErrorBoundary></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;