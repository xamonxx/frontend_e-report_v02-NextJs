"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  ExternalLink,
  MapPin,
  UserRound,
  Phone,
  RefreshCw,
  Building2,
  ClipboardCheck,
  MessageSquare,
  MessageCircle,
  MapPinned,
  Home,
  Package,
  UserRoundCheck,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useSurveys } from "@/lib/hooks/useSurveys";
import type { Survey, SurveyState } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, rawPhoneDigits } from "@/lib/utils";
import { SearchField } from "@/components/ui/search-field";
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
  const [state, setState] = useState<SurveyState | "">("");
  const [page, setPage] = useState(1);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const trimmedSearch = search.trim();
  const { data, isLoading, isFetching, refetch } = useSurveys({
    page,
    per_page: 10,
    state,
    search: trimmedSearch || undefined,
  });
  const rows = useMemo(() => data?.data ?? [], [data?.data]);
  const meta = data?.meta;

  useEffect(() => {
    setPage(1);
  }, [trimmedSearch, state]);

  return (
    <div className="space-y-4 pb-2 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20 sm:h-11 sm:w-11">
            <ClipboardList className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
          </span>
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-9 w-fit min-w-[7rem] gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-3.5 text-sm font-medium text-foreground/90 shadow-[0_10px_24px_-16px_rgba(8,185,209,0.55)] ring-1 ring-primary/15 backdrop-blur-xl transition-colors hover:border-primary/35 hover:bg-white/[0.1] hover:ring-primary/25 focus-visible:ring-2 focus-visible:ring-primary/25 sm:h-10 sm:px-4 lg:self-start"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", isFetching && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      <Card className="data-toolbar">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchField
              containerClassName="flex-1"
              pageSearch
              showShortcut
              value={search}
              onValueChange={setSearch}
              placeholder="Cari konsumen, ID, nomor, atau surveyor"
              aria-label="Cari data konsumen survey"
              className="data-toolbar-control h-10"
            />
            <CustomSelect
              value={state}
              onChange={(value) => setState(value as SurveyState | "")}
              placeholder="Semua status"
              options={[
                { value: "", label: "Semua status" },
                ...Object.entries(META).map(([value, meta]) => ({
                  value,
                  label: meta.label,
                })),
              ]}
              className="data-toolbar-control box-border h-10 w-full rounded-xl border px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-primary/15 sm:w-52"
            />
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
                Belum ada data konsumen survey
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Request survey yang masuk akan tampil di tabel ini.
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
        </CardContent>
      </Card>
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
  return (
    <Dialog open={!!survey} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!top-0 !right-0 !bottom-0 !left-auto h-dvh max-h-dvh w-full !max-w-xl !translate-x-0 !translate-y-0 overflow-y-auto rounded-none border-border/80 bg-background/95 p-4 shadow-2xl backdrop-blur-sm sm:!max-w-xl sm:p-5 data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right">
        <DialogHeader className="pr-20">
          <DialogTitle>Detail Konsumen Survey</DialogTitle>
          <DialogDescription>
            {c?.client_name ?? "-"} - {c?.consultation_id ?? "-"}
          </DialogDescription>
        </DialogHeader>
        {survey && (
          <div className="grid gap-3 text-xs sm:grid-cols-2 sm:gap-4">
            <DetailItem label="Status" value={META[survey.state].label} />
            <DetailItem
              label="Status Hasil"
              value={survey.result_status?.name ?? "Belum ada hasil"}
            />
            <DetailItem label="Akun" value={c?.account?.name ?? "-"} />
            <DetailItem
              label="Surveyor"
              value={survey.surveyor?.name ?? "Belum ditentukan"}
            />
            <DetailItem label="WhatsApp" value={c?.phone ?? "-"} />
            <DetailItem
              label="Jadwal"
              value={formatDate(survey.scheduled_at || survey.requested_at)}
            />
            <DetailItem
              label="Alamat"
              value={
                c?.address ||
                [c?.district, c?.city, c?.province]
                  .filter(Boolean)
                  .join(", ") ||
                "-"
              }
              wide
            />
            <DetailItem
              label="Item / Kebutuhan"
              value={survey.requested_item || c?.product_details || "-"}
              wide
            />
            <DetailItem
              label="Catatan Admin"
              value={survey.admin_notes || "-"}
              wide
            />
            <DetailItem
              label="Catatan Lokasi"
              value={survey.location_notes || "-"}
              wide
            />
            <DetailItem
              label="Catatan Surveyor"
              value={survey.result_notes || "Belum ada catatan"}
              wide
              emphasize
            />
            <DetailItem
              label="Rekomendasi"
              value={survey.recommendations || "-"}
              wide
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
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
        Status: ClipboardCheck,
        "Status Hasil": ClipboardCheck,
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
        "group rounded-xl border border-border/70 bg-card/80 p-3.5 shadow-sm transition-colors hover:border-primary/30 hover:bg-card sm:p-4",
        wide && "sm:col-span-2",
        emphasize && "border-primary/30 bg-primary/[0.06]",
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary/80",
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
