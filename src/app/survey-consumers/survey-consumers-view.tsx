"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarDays,
  ClipboardList,
  ExternalLink,
  MapPin,
  UserRound,
  Phone,
  RefreshCw,
  Building2,
  MessageSquare,
  MessageCircle,
  MapPinned,
  Home,
  Package,
  UserRoundCheck,
  Eye,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  CalendarRange,
  RotateCcw,
} from "lucide-react";
import { useSurveys, useSurveyors } from "@/lib/hooks/useSurveys";
import { useAccounts } from "@/lib/hooks/useMasterData";
import type { Survey, SurveyState } from "@/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, rawPhoneDigits } from "@/lib/utils";
import { SearchField } from "@/components/ui/search-field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDebounce } from "use-debounce";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const META: Record<SurveyState, { label: string; tone: string }> = {
  requested: {
    label: "Request Survey",
    tone: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  scheduled: {
    label: "Terjadwal",
    tone: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  in_progress: {
    label: "Sedang Survey",
    tone: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  },
  completed: {
    label: "Selesai",
    tone: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
  cancelled: {
    label: "Dibatalkan",
    tone: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
  },
};

const filterControlClass =
  "border-[color:color-mix(in_srgb,var(--primary-theme)_18%,var(--border))] bg-transparent text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-[border-color,background-color,color,box-shadow] duration-200 hover:border-[color:color-mix(in_srgb,var(--primary-theme)_38%,var(--border))] hover:bg-[color-mix(in_srgb,var(--primary-theme)_6%,var(--card))] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25";

const filterIconClass = `relative inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border ${filterControlClass}`;

const activeFilterClass =
  "border-primary/55 bg-primary/10 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]";

function FilterOption({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-lg px-3 py-2 text-left text-[11px] transition-colors",
        active
          ? "bg-primary/12 font-semibold text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRequestedDate(date?: string | null, time?: string | null) {
  if (!date) return "-";
  const raw = date.slice(0, 10);
  const parsed = new Date(`${raw}T00:00:00`);
  const label = Number.isNaN(parsed.getTime())
    ? raw
    : parsed.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
  return `${label}${time ? ` - ${time.slice(0, 5)}` : ""}`;
}

export default function SurveyConsumersView() {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 400);
  const [state, setState] = useState<SurveyState | "">("");
  const [account, setAccount] = useState("");
  const [surveyorId, setSurveyorId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [surveyorOpen, setSurveyorOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const trimmedSearch = debouncedSearch.trim();
  const { data: accounts = [] } = useAccounts();
  const { data: surveyorsResponse } = useSurveyors();
  const surveyors = surveyorsResponse?.data ?? [];
  const { data, isLoading, isFetching, refetch } = useSurveys({
    page,
    per_page: 10,
    state,
    search: trimmedSearch || undefined,
    account: account ? Number(account) : undefined,
    surveyor_id: surveyorId ? Number(surveyorId) : undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
  });
  const rows = useMemo(() => data?.data ?? [], [data?.data]);
  const meta = data?.meta;

  useEffect(() => {
    setPage(1);
  }, [trimmedSearch, state, account, surveyorId, startDate, endDate]);

  const hasActiveFilters = Boolean(
    search || state || account || surveyorId || startDate || endDate,
  );

  const resetFilters = () => {
    setSearch("");
    setState("");
    setAccount("");
    setSurveyorId("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  return (
    <div className="space-y-4 pb-2 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-500/80">
              Master Survey
            </p>
            <h1 className="text-[1.35rem] font-bold tracking-tight text-foreground sm:text-2xl">
              Data Konsumen Survey
            </h1>
            <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
              Satu tabel untuk request, penugasan, jadwal, dan hasil survey.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-1 sm:px-0">
          <div className="data-toolbar flex w-full flex-col gap-2 p-2 xl:w-fit xl:flex-row xl:items-center">
            <SearchField
              containerClassName="w-full xl:w-[420px] xl:min-w-0 xl:flex-none"
              pageSearch
              showShortcut
              value={search}
              onValueChange={setSearch}
              placeholder="Cari konsumen, ID, nomor, atau surveyor"
              aria-label="Cari data konsumen survey"
              className="data-toolbar-control h-10"
            />
            <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5 xl:w-auto xl:flex-nowrap">
              <Popover open={statusOpen} onOpenChange={setStatusOpen}>
                <PopoverTrigger
                  title="Filter status"
                  aria-label="Filter status survey"
                  className={cn(filterIconClass, state && activeFilterClass)}
                >
                  <ListFilter className="h-4 w-4" />
                  {state && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full border-2 border-background bg-primary" />}
                </PopoverTrigger>
                <PopoverContent className="min-w-[210px] p-2" align="start">
                  <p className="px-2 pb-1.5 pt-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Status Survey</p>
                  <FilterOption active={!state} onClick={() => { setState(""); setStatusOpen(false); }}>Semua Status</FilterOption>
                  {Object.entries(META).map(([value, meta]) => (
                    <FilterOption
                      key={value}
                      active={state === value}
                      onClick={() => { setState(value as SurveyState); setStatusOpen(false); }}
                    >
                      {meta.label}
                    </FilterOption>
                  ))}
                </PopoverContent>
              </Popover>

              <Popover open={accountOpen} onOpenChange={setAccountOpen}>
                <PopoverTrigger
                  title="Filter akun"
                  aria-label="Filter akun"
                  className={cn(filterIconClass, account && activeFilterClass)}
                >
                  <Building2 className="h-4 w-4" />
                  {account && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full border-2 border-background bg-primary" />}
                </PopoverTrigger>
                <PopoverContent className="max-h-[280px] min-w-[220px] overflow-y-auto p-2" align="start">
                  <p className="px-2 pb-1.5 pt-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Akun</p>
                  <FilterOption active={!account} onClick={() => { setAccount(""); setAccountOpen(false); }}>Semua Akun</FilterOption>
                  {accounts.map((item: { id: number; name: string }) => (
                    <FilterOption key={item.id} active={account === String(item.id)} onClick={() => { setAccount(String(item.id)); setAccountOpen(false); }}>
                      {item.name}
                    </FilterOption>
                  ))}
                </PopoverContent>
              </Popover>

              <Popover open={surveyorOpen} onOpenChange={setSurveyorOpen}>
                <PopoverTrigger
                  title="Filter surveyor"
                  aria-label="Filter surveyor"
                  className={cn(filterIconClass, surveyorId && activeFilterClass)}
                >
                  <UserRoundCheck className="h-4 w-4" />
                  {surveyorId && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full border-2 border-background bg-primary" />}
                </PopoverTrigger>
                <PopoverContent className="max-h-[280px] min-w-[220px] overflow-y-auto p-2" align="start">
                  <p className="px-2 pb-1.5 pt-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Surveyor</p>
                  <FilterOption active={!surveyorId} onClick={() => { setSurveyorId(""); setSurveyorOpen(false); }}>Semua Surveyor</FilterOption>
                  {surveyors.map((item) => (
                    <FilterOption key={item.id} active={surveyorId === String(item.id)} onClick={() => { setSurveyorId(String(item.id)); setSurveyorOpen(false); }}>
                      {item.name}
                    </FilterOption>
                  ))}
                </PopoverContent>
              </Popover>

              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger
                  title="Filter rentang jadwal"
                  aria-label="Filter rentang jadwal"
                  className={cn(filterIconClass, (startDate || endDate) && activeFilterClass)}
                >
                  <CalendarRange className="h-4 w-4" />
                  {(startDate || endDate) && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full border-2 border-background bg-primary" />}
                </PopoverTrigger>
                <PopoverContent className="min-w-[250px] p-3" align="start">
                  <p className="mb-2.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Rentang Jadwal</p>
                  <div className="space-y-2">
                    <label className="block text-[10px] text-muted-foreground">
                      Dari tanggal
                      <Input type="date" value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} className="mt-1 h-9 text-xs" />
                    </label>
                    <label className="block text-[10px] text-muted-foreground">
                      Sampai tanggal
                      <Input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} className="mt-1 h-9 text-xs" />
                    </label>
                    {(startDate || endDate) && (
                      <button type="button" onClick={() => { setStartDate(""); setEndDate(""); }} className="text-[10px] font-medium text-red-400 hover:text-red-300">
                        Hapus rentang tanggal
                      </button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              <div className="ml-auto flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  disabled={!hasActiveFilters}
                  className={cn("h-10 gap-1.5 rounded-xl border px-3 text-xs", filterControlClass)}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  title="Perbarui data"
                  aria-label="Perbarui data konsumen survey"
                  className={cn("size-10 rounded-xl border p-0", filterControlClass)}
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
                </Button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center sm:p-12 dark:border-zinc-800">
              <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-semibold">
                {hasActiveFilters ? "Data tidak ditemukan" : "Belum ada data konsumen survey"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {hasActiveFilters
                  ? "Ubah atau reset filter untuk melihat data lainnya."
                  : "Request survey yang masuk akan tampil di tabel ini."}
              </p>
            </div>
          ) : (
            <>
              <div className="data-table-shell hidden lg:block">
                <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th className="whitespace-nowrap border-b border-border bg-muted/60 px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground dark:border-zinc-700/60 dark:bg-zinc-800/80 dark:text-zinc-300">Konsumen</th>
                      <th className="whitespace-nowrap border-b border-border bg-muted/60 px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground dark:border-zinc-700/60 dark:bg-zinc-800/80 dark:text-zinc-300">Akun / Kontak</th>
                      <th className="whitespace-nowrap border-b border-border bg-muted/60 px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground dark:border-zinc-700/60 dark:bg-zinc-800/80 dark:text-zinc-300">Lokasi</th>
                      <th className="whitespace-nowrap border-b border-border bg-muted/60 px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground dark:border-zinc-700/60 dark:bg-zinc-800/80 dark:text-zinc-300">Jadwal</th>
                      <th className="whitespace-nowrap border-b border-border bg-muted/60 px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground dark:border-zinc-700/60 dark:bg-zinc-800/80 dark:text-zinc-300">Item</th>
                      <th className="whitespace-nowrap border-b border-border bg-muted/60 px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground dark:border-zinc-700/60 dark:bg-zinc-800/80 dark:text-zinc-300">Surveyor</th>
                      <th className="whitespace-nowrap border-b border-border bg-muted/60 px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground dark:border-zinc-700/60 dark:bg-zinc-800/80 dark:text-zinc-300">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300/65 dark:divide-white/10">
                    {rows.map((survey) => (
                      <SurveyRow
                        key={survey.id}
                        survey={survey}
                        onOpen={() => setSelectedSurvey(survey)}
                      />
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
              <div className="grid gap-3 lg:hidden">
                {rows.map((survey) => (
                  <SurveyMobileCard
                    key={survey.id}
                    survey={survey}
                    onOpen={() => setSelectedSurvey(survey)}
                  />
                ))}
              </div>
            </>
          )}
          <p className="text-[11px] text-muted-foreground">
            Menampilkan {rows.length} dari {data?.meta?.total ?? 0} request
            survey.
          </p>
          {meta && meta.last_page > 1 && (
            <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/60 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-900/50">
              <p className="text-[10px] text-muted-foreground/70">
                Maksimal <span className="font-semibold text-muted-foreground">{meta.per_page}</span> data per halaman.
              </p>
              <nav aria-label="Pagination data konsumen survey" className="flex items-center justify-between gap-2 sm:justify-end">
                <Button
                  variant="outline"
                  size="xs"
                  disabled={meta.current_page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 cursor-pointer rounded-xl border-border bg-card text-foreground/80 transition-all duration-250 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
                >
                  <ChevronLeft className="mr-0.5 h-3.5 w-3.5" />
                  Sebelumnya
                </Button>
                <span className="px-2 text-xs font-semibold text-muted-foreground">
                  <span className="sm:hidden">{meta.current_page} / {meta.last_page}</span>
                  <span className="hidden sm:inline">Halaman {meta.current_page} dari {meta.last_page}</span>
                </span>
                <Button
                  variant="outline"
                  size="xs"
                  disabled={meta.current_page >= meta.last_page}
                  onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                  className="h-8 cursor-pointer rounded-xl border-border bg-card text-foreground/80 transition-all duration-250 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
                >
                  Selanjutnya
                  <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
                </Button>
              </nav>
            </div>
          )}
      </div>
      <SurveyDetailDialog
        survey={selectedSurvey}
        onClose={() => setSelectedSurvey(null)}
      />
    </div>
  );
}

function SurveyRow({ survey, onOpen }: { survey: Survey; onOpen: () => void }) {
  const c = survey.consultation;
  const meta = META[survey.state];
  return (
    <tr
      onClick={onOpen}
      className="group cursor-pointer border-b border-border border-l-2 border-transparent odd:bg-card even:bg-muted/[0.18] transition-colors hover:border-l-amber-500/60 hover:bg-amber-500/[0.06] dark:border-zinc-800"
    >
      <td className="px-5 py-3.5 align-top">
        <p className="font-semibold text-foreground">{c?.client_name ?? "-"}</p>
        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
          {c?.consultation_id ?? `SURVEY-${survey.id}`}
        </p>
      </td>
      <td className="px-5 py-3.5 align-top">
        <p className="text-foreground/80">{c?.account?.name ?? "-"}</p>
        {c?.phone && (
          <a
            onClick={(event) => event.stopPropagation()}
            href={`https://wa.me/${rawPhoneDigits(c.phone)}`}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-emerald-600 hover:underline"
          >
            <Phone className="h-3 w-3" />
            {c.phone}
          </a>
        )}
      </td>
      <td className="max-w-[220px] px-5 py-3.5 align-top">
        <p className="flex gap-1.5 text-foreground/80">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span className="line-clamp-2">
            {c?.address ||
              [c?.district, c?.city, c?.province].filter(Boolean).join(", ") ||
              "-"}
          </span>
        </p>
        {survey.google_maps_url && (
          <a
            onClick={(event) => event.stopPropagation()}
            href={survey.google_maps_url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-[10px] text-blue-500 hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Buka Maps
          </a>
        )}
      </td>
      <td className="px-5 py-3.5 align-top">
        <p className="flex items-center gap-1.5 text-foreground/80">
          <CalendarDays className="h-3.5 w-3.5 text-blue-500" />
          {formatDate(survey.scheduled_at || survey.requested_at)}
        </p>
        {survey.requested_date && (
          <p className="mt-1 text-[10px] text-muted-foreground">
            Diminta:{" "}
            {formatRequestedDate(survey.requested_date, survey.requested_time)}
          </p>
        )}
      </td>
      <td className="max-w-[180px] px-5 py-3.5 align-top">
        <p className="line-clamp-2 text-foreground/80">
          {survey.requested_item || c?.product_details || "-"}
        </p>
      </td>
      <td className="px-5 py-3.5 align-top">
        <p className="inline-flex items-center gap-1.5 text-foreground/80">
          <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
          {survey.surveyor?.name ?? "Belum ditentukan"}
        </p>
      </td>
      <td className="px-5 py-3.5 align-top">
        <span
          className={cn(
            "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold",
            meta.tone,
          )}
        >
          {meta.label}
        </span>
      </td>
    </tr>
  );
}

function SurveyMobileCard({
  survey,
  onOpen,
}: {
  survey: Survey;
  onOpen: () => void;
}) {
  const c = survey.consultation;
  const meta = META[survey.state];
  return (
    <article
      onClick={onOpen}
      className="cursor-pointer rounded-2xl border border-border/80 bg-background/70 p-4 shadow-sm transition-transform active:scale-[0.99] dark:border-zinc-800 dark:bg-zinc-950/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-foreground">
            {c?.client_name ?? "-"}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            {c?.consultation_id ?? `SURVEY-${survey.id}`}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-1 text-[9px] font-bold",
            meta.tone,
          )}
        >
          {meta.label}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-[11px]">
        <div>
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Akun
          </p>
          <p className="truncate text-foreground/85">
            {c?.account?.name ?? "-"}
          </p>
        </div>
        <div>
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Surveyor
          </p>
          <p className="truncate text-foreground/85">
            {survey.surveyor?.name ?? "Belum ditentukan"}
          </p>
        </div>
        <div className="col-span-2">
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Jadwal
          </p>
          <p className="flex items-center gap-1.5 text-foreground/85">
            <CalendarDays className="h-3.5 w-3.5 text-blue-500" />
            {formatDate(survey.scheduled_at || survey.requested_at)}
          </p>
          {survey.requested_date && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              Diminta:{" "}
              {formatRequestedDate(
                survey.requested_date,
                survey.requested_time,
              )}
            </p>
          )}
        </div>
        <div className="col-span-2 hidden">
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Lokasi
          </p>
          <p className="flex gap-1.5 text-foreground/85">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            <span className="line-clamp-2">
              {c?.address ||
                [c?.district, c?.city, c?.province]
                  .filter(Boolean)
                  .join(", ") ||
                "-"}
            </span>
          </p>
        </div>
        <div className="col-span-2 hidden">
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Kebutuhan
          </p>
          <p className="line-clamp-2 text-foreground/85">
            {survey.requested_item || c?.product_details || "-"}
          </p>
        </div>
        <div className="col-span-2 hidden">
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Status Hasil
          </p>
          {survey.result_status ? (
            <span
              className="inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold"
              style={{
                color: survey.result_status.color,
                borderColor: `${survey.result_status.color}55`,
                backgroundColor: `${survey.result_status.color}1a`,
              }}
            >
              {survey.result_status.name}
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              Belum ada hasil
            </span>
          )}
        </div>
        <div className="col-span-2 hidden">
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Catatan Surveyor
          </p>
          <p className="whitespace-pre-wrap text-foreground/75">
            {survey.result_notes || "Belum ada catatan"}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          {c?.phone ? (
            <a
              onClick={(event) => event.stopPropagation()}
              href={`https://wa.me/${rawPhoneDigits(c.phone)}`}
              aria-label="Chat WhatsApp"
              title="Chat WhatsApp"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-400/25 bg-emerald-500/10 text-emerald-500 transition-colors hover:bg-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
            >
              <MessageCircle className="h-[18px] w-[18px]" />
            </a>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              No WhatsApp
            </span>
          )}
          {survey.google_maps_url && (
            <a
              onClick={(event) => event.stopPropagation()}
              href={survey.google_maps_url}
              target="_blank"
              rel="noreferrer"
              aria-label="Buka lokasi di Google Maps"
              title="Buka lokasi di Google Maps"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-400/25 bg-blue-500/10 text-blue-500 transition-colors hover:bg-blue-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50"
            >
              <MapPinned className="h-[18px] w-[18px]" />
            </a>
          )}
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onOpen()
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <Eye className="h-3.5 w-3.5" />
          Detail
        </button>
      </div>
    </article>
  );
}

function SurveyDetailDialog({
  survey,
  onClose,
}: {
  survey: Survey | null;
  onClose: () => void;
}) {
  const c = survey?.consultation;
  const stateMeta = survey ? META[survey.state] : null;
  return (
    <Dialog open={!!survey} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="survey-detail-panel !bottom-0 !left-auto !right-0 !top-0 h-dvh max-h-dvh w-full !max-w-2xl !translate-x-0 !translate-y-0 overflow-y-auto rounded-none border-border/80 bg-card p-0 shadow-2xl sm:!max-w-2xl data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right dark:border-zinc-800/80 [&>[data-slot=dialog-close]]:right-4 [&>[data-slot=dialog-close]]:top-4 [&>[data-slot=dialog-close]]:z-20 [&>[data-slot=dialog-close]]:border [&>[data-slot=dialog-close]]:border-border/70 [&>[data-slot=dialog-close]]:bg-card/80">
        <DialogHeader className="sticky top-0 z-10 border-b border-border/70 bg-card/95 px-5 py-5 pr-16 backdrop-blur-xl dark:border-zinc-800/80">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-primary">Master Survey</p>
          <DialogTitle className="text-xl font-bold tracking-tight">Detail Konsumen Survey</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {c?.client_name ?? "-"} / {c?.consultation_id ?? "-"}
          </DialogDescription>
          {survey && stateMeta && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className={cn("inline-flex rounded-md border px-2.5 py-1 text-[10px] font-bold", stateMeta.tone)}>
                {stateMeta.label}
              </span>
              {survey.result_status ? (
                <span
                  className="inline-flex rounded-md border px-2.5 py-1 text-[10px] font-bold"
                  style={{
                    color: survey.result_status.color,
                    borderColor: `${survey.result_status.color}55`,
                    backgroundColor: `${survey.result_status.color}1a`,
                  }}
                >
                  {survey.result_status.name}
                </span>
              ) : (
                <span className="inline-flex rounded-md border border-border bg-muted/40 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                  Belum ada hasil
                </span>
              )}
            </div>
          )}
        </DialogHeader>
        {survey && (
          <div className="space-y-6 px-5 py-6">
            <DetailSection title="Informasi Survey">
              <DetailItem label="Akun" value={c?.account?.name ?? "-"} />
              <DetailItem label="Surveyor" value={survey.surveyor?.name ?? "Belum ditentukan"} />
              <DetailItem label="WhatsApp" value={c?.phone ?? "-"} />
              <DetailItem label="Jadwal" value={formatDate(survey.scheduled_at || survey.requested_at)} />
              <DetailItem
                label="Alamat"
                value={c?.address || [c?.district, c?.city, c?.province].filter(Boolean).join(", ") || "-"}
                wide
              />
              <DetailItem label="Item / Kebutuhan" value={survey.requested_item || c?.product_details || "-"} wide />
            </DetailSection>

            <DetailSection title="Catatan & Hasil">
              <DetailItem label="Catatan Admin" value={survey.admin_notes || "-"} wide />
              <DetailItem label="Catatan Lokasi" value={survey.location_notes || "-"} wide />
              <DetailItem label="Catatan Surveyor" value={survey.result_notes || "Belum ada catatan"} wide emphasize />
              <DetailItem label="Rekomendasi" value={survey.recommendations || "-"} wide />
            </DetailSection>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{title}</h3>
      <div className="grid gap-px overflow-hidden rounded-xl border border-border/70 bg-border/60 text-xs sm:grid-cols-2 dark:border-zinc-800/80 dark:bg-zinc-800/80">
        {children}
      </div>
    </section>
  );
}

function DetailItem({
  label,
  value,
  wide,
  emphasize,
}: {
  label: string;
  value: string;
  wide?: boolean;
  emphasize?: boolean;
}) {
  const Icon =
    (
      {
        Akun: Building2,
        Surveyor: UserRoundCheck,
        WhatsApp: Phone,
        Jadwal: CalendarDays,
        Alamat: MapPin,
        "Item / Kebutuhan": Package,
        "Catatan Admin": MessageSquare,
        "Catatan Lokasi": Home,
        "Catatan Surveyor": MessageSquare,
        Rekomendasi: ClipboardList,
      } as Record<string, typeof ClipboardList>
    )[label] ?? ClipboardList;

  return (
    <div
      className={cn(
        "group bg-card p-3.5 transition-colors hover:bg-muted/40 sm:p-4",
        wide && "sm:col-span-2",
        emphasize && "bg-primary/[0.06]",
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-primary/15 bg-primary/10 text-primary/80",
            emphasize && "bg-primary/15 text-primary",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
      </div>
      <p
        className={cn(
          "whitespace-pre-wrap pl-9 leading-relaxed text-foreground/85",
          emphasize && "font-medium text-primary/90",
        )}
      >
        {value}
      </p>
    </div>
  );
}
